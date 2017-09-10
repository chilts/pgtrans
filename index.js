// --------------------------------------------------------------------------------------------------------------------

"use strict"

// npm
const async = require('async')
const debug = require('debug')('pgtrans')

// --------------------------------------------------------------------------------------------------------------------

// This function just abstracts away any cleanup we need to do, whether everything was successful, or it failed
// somewhere in the middle of the transaction, or even if it failed during connection prior to getting a valid client
// or release function.
//
// Usually when given an error, we check it and then deal with it first ... but here we're going to deal with the
// successful case first. Why? Because it's easier.
function cleanup(err, client, release, callback) {
  debug('pgtrans: cleanup() - err:', err)

  // --- The SUCCESSFUL Case

  if ( !err ) {
    debug('pgtrans: cleanup() - No error during client request, begin, transaction, or commit.')
    if ( release ) {
      debug('pgtrans: cleanup() - Releasing client.')
      release()
    }
    return callback()
  }

  // --- The ERROR Case ---

  // if we don't yet have a client, then we just callback since we have nothing to release
  if ( !client ) {
    debug('pgtrans: cleanup() - No client therefore nothing to release.')
    return callback(err)
  }

  // we have a client, so rollback the transaction
  client.query("ROLLBACK", (err2) => {
    if ( err2 ) {
      debug("pgtrans: cleanup() - Received error when rolling back a transaction, err:", err2)
    }
    else {
      debug('pgtrans: cleanup() - Rollback completed successfully.')
    }

    // release the client
    if ( release ) {
      debug('pgtrans: cleanup() - Releasing client.')
      release()
    }

    // and finally return the original error
    debug('pgtrans: cleanup() - Finished.')
    callback(err)
  })
}

// We use async series to help run each thing in sequence: connect, begin, the SQL, commit.
function pgtrans(pool, fn, callback) {
  debug('pgtrans: start')

  let client
  let releaseClient

  async.series(
    [
      // get a client
      (done) => {
        pool.connect((err, newClient, newRelease) => {
          if (err) return done(err)

          debug('pgtrans: connected via the pool')

          // remember the client and release functions for later
          client        = newClient
          releaseClient = newRelease

          done()
        })
      },
      // begin transaction
      (done) => {
        debug('pgtrans(): beginning transaction ...')
        client.query('BEGIN', done)
      },
      // call the user function
      (done) => {
        debug('pgtrans(): calling user function ...')
        fn(client, done)
      },
      // commit transaction transaction
      (done) => {
        debug('pgtrans(): commiting transaction ...')
        client.query('COMMIT', done)
      },
    ],
    (err) => {
      // call the cleanup function to do all the important stuff for us
      debug('pgtrans() - err:', err)
      cleanup(err, client, releaseClient, callback)
    }
  )
}

// --------------------------------------------------------------------------------------------------------------------

module.exports = pgtrans

// --------------------------------------------------------------------------------------------------------------------

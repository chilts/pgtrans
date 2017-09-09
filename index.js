// --------------------------------------------------------------------------------------------------------------------

"use strict"

const async = require('async')

// --------------------------------------------------------------------------------------------------------------------

// This function just abstracts away any cleanup we need to do, whether everything was successful, or it failed
// somewhere in the middle of the transaction, or even if it failed during connection prior to getting a valid client
// or release function.
//
// Usually when given an error, we check it and then deal with it first ... but here we're going to deal with the
// successful case first. Why? Because it's easier.
function cleanup(err, client, release, callback) {
  // --- The SUCCESSFUL Case

  if ( !err ) {
    // console.log('pgtrans - No error during client request, begin, transaction, or commit ... finishing')
    if ( release ) {
      release()
    }
    return callback()
  }

  // --- The ERROR Case ---

  // if we don't yet have a client, then we just callback since we have nothing to release
  if ( !client ) {
    return callback(err)
  }

  // we have a client, so rollback the transaction
  client.query("ROLLBACK", (err2) => {
    if ( err2 ) {
      console.warn("pgtrans - received error when rolling back a transaction :", err2)
    }
    else {
      console.log('pgtrans - rollback completed successfully')
    }

    // release the client
    if ( release ) {
      release()
    }

    // and finally return the original error
    callback(err)
  })
}

// We use async series to help run each thing in sequence: connect, begin, the SQL, commit.
function pgtrans(pool, fn, callback) {
  let client
  let releaseClient

  async.series(
    [
      // get a client
      (done) => {
        pool.connect((err, newClient, newRelease) => {
          if (err) return done(err)

          // remember the client and release functions for later
          client        = newClient
          releaseClient = newRelease

          done()
        })
      },
      // begin transaction
      (done) => {
        client.query('BEGIN', done)
      },
      // call the user function
      (done) => {
        fn(client, done)
      },
      // commit transaction transaction
      (done) => {
        client.query('BEGIN', done)
      },
    ],
    (err) => {
      // call the cleanup function to do all the important stuff for us
      cleanup(err, client, releaseClient, callback)
    }
  )
}

// --------------------------------------------------------------------------------------------------------------------

module.exports = pgtrans

// --------------------------------------------------------------------------------------------------------------------

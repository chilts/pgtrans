// --------------------------------------------------------------------------------------------------------------------

// npm
const pg = require('pg')
const test = require('tape')

// local
const pgtrans = require('..')

// --------------------------------------------------------------------------------------------------------------------
// setup

const pool = new pg.Pool({
  connectionString  : process.env.DATABASE_URL || 'postgres://pgtrans@localhost/pgtrans',
  idleTimeoutMillis : 1000,
})

// --------------------------------------------------------------------------------------------------------------------
// tests

test('Create a usr table', (t) => {
  t.plan(2)

  function createUsrTable(client, callback) {
    client.query("CREATE TABLE usr(email TEXT NOT NULL UNIQUE)", (err) => {
      // if (err) console.log(err)
      t.ok(!err, 'No error when creating the usr table')
      callback(err)
    })
  }

  // run the function in a transaction
  pgtrans(pool, createUsrTable, (err) => {
    t.ok(!err, 'No error when committing the transaction')
    t.end()
  })
})

test('Add two rows in a transaction', (t) => {
  t.plan(10)

  function insert(client, callback) {
    client.query("INSERT INTO usr(email) VALUES('me@example.com')", (err) => {
      // if (err) console.log(err)
      t.ok(!err, 'No error when inserting into usr')

      client.query("INSERT INTO usr(email) VALUES('me@example.net')", (err) => {
        // if (err) console.log(err)
        t.ok(!err, 'No error when inserting into usr again')
        callback()
      })
    })
  }

  function count(client, callback) {
    client.query("SELECT count(*) FROM usr", (err, resp) => {
      // if (err) console.log(err)
      t.ok(!err, 'No error when counting usrs')

      t.equal(resp.rows.length, 1, 'Got one row back')
      t.equal(resp.rows[0].count, '2', 'Two usr rows exist')

      // send this value back to the caller
      callback(null, resp.rows[0].count|0)
    })
  }

  function del(client, callback) {
    client.query("DELETE FROM usr", (err, resp) => {
      // if (err) console.log(err)
      t.ok(!err, 'No error when deleting usrs')
      callback()
    })
  }

  // run the function in a transaction
  pgtrans(pool, insert, (err) => {
    t.ok(!err, 'No error when running the insert transaction')

    pgtrans(pool, count, (err, count) => {
      t.ok(!err, 'No error when running the count transaction')

      t.equal(count, 2, 'Two usrs exist')

      pgtrans(pool, del, (err) => {
        t.ok(!err, 'No error when running the del transaction')
        t.end()
      })
    })
  })
})

test('Add duplicate rows, so the transaction is aborted', (t) => {
  t.plan(9)

  function insert(client, callback) {
    client.query("INSERT INTO usr(email) VALUES('me@example.com')", (err) => {
      // if (err) console.log(err)
      t.ok(!err, 'No error when inserting into usr')

      client.query("INSERT INTO usr(email) VALUES('me@example.com')", (err) => {
        // if (err) console.log(err)
        t.ok(!!err, 'Error when inserting a duplicate user')
        t.equal(err.constraint, 'usr_email_key', 'Email constraint violated')
        callback(err)
      })
    })
  }

  function count(client, callback) {
    client.query("SELECT count(*) FROM usr", (err, resp) => {
      // if (err) console.log(err)
      t.ok(!err, 'No error when counting usrs')

      t.equal(resp.rows.length, 1, 'Got one row back')
      t.equal(resp.rows[0].count|0, 0, 'No usr exists')

      // send this value back to the caller
      callback(null, resp.rows[0].count|0)
    })
  }

  // run the function in a transaction
  pgtrans(pool, insert, (err) => {
    t.ok(!!err, 'Got an err when running the transaction')

    pgtrans(pool, count, (err, numberOfUsrs) => {
      t.ok(!err, 'No error when running count()')

      t.equal(numberOfUsrs, 0, 'Value returned is passed back')
      t.end()
    })
  })
})

test('Drop usr table', (t) => {
  t.plan(1)

  function dropUsrTable(client, callback) {
    client.query("DROP TABLE usr", callback)
  }

  // run the function in a transaction
  pgtrans(pool, dropUsrTable, (err) => {
    t.ok(!err, 'No error when committing the transaction')
    t.end()
  })
})

// --------------------------------------------------------------------------------------------------------------------

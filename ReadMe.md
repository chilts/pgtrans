# pgtrans #

Helps you perform transactions more easily when using [pg](https://www.npmjs.com/package/pg).

All you need to do is pass `pgtrans` the `pg.pool` you created and the function you wish to run inside a transaction.

Your function will be calls with a `pg.client` and a `callback`. When finished, call `callback()` with an `err` to
`ROLLBACK` the transaction, or without to `COMMIT`.

## Synopsis ##

```js
const pg      = require('pg')
const pgtrans = require('pgtrans')

const pool = new pg.Pool({
  connectionString : "postgresql://dbuser@dbhost/dbname"
})

// Any function you want to run between BEGIN and COMMIT.
// Return an error to rollback.

function userCount(client, done) {
  client.query("SELECT count(*) AS count FROM users", (err, res) => {
    if (err) return done(err)
    done(null, res.rows[0].count)
  })
}

// run the function in a transaction
pgtrans(
  pool,
  userCount,
  (err, count) => {
    if (err) {
      console.warn('' + err)
    }

    console.log('Number of users:', count)

    // End the pool so the program can quit.
    // (You wouldn't usually do this here.)
    pool.end()
  }
)
```

Inside the function you pass to `pgtrans` you can perform as many SQL
operations as you require. Just call `callback()` with an error to rollback the
transaction. If there was no error `pgtrans` will commit instead.

## Setup ##

Just connect to Postgres as you usually would by creating a `pg.pool`:

```js
const pg      = require('pg')
const pgtrans = require('pgtrans')

const pool = new pg.Pool({
  connectionString : "postgresql://dbuser@dbhost/dbname"
})
```

## Returning Values ##

When returning values from your function, these will be returned along with any error encountered, or `null` if no error occurred.

```js
function userCount(client, done) {
  client.query("SELECT count(*) AS count FROM users", (err, res) => {
    if (err) return done(err)
    // pass back some results
    done(null, res.rows[0].count)
  })
}
```

As you can see, the count is returned.

```
userCount(pool, (err, count) => {
  // ToDo: check err.
  console.log('count:', count)
})
```

You can return any number of values depending on the needs of your transaction.

## Author ##

Written by [Andrew Chilton](https://chilts.me/):

* [Blog](https://chilts.org/)
* [GitHub](https://github.com/chilts)
* [Twitter](https://twitter.com/andychilton)
* [Instagram](http://instagram.com/thechilts)

# License #

ISC

(Ends)

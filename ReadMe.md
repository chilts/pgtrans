# pgtrans #

Helps you perform transactions more easily when using [pg](https://www.npmjs.com/package/pg).

Just pass it a function

## Synopsis ##

```js
const pg      = require('pg')
const pgtrans = require('pgtrans')

const pool = new pg.Pool({
  connectionString : "postgresql://dbuser@dbhost/dbname"
})

// Any function you want to run between BEGIN and COMMIT.
// Return an error to rollback.

function selCount(client, callback) {
  client.query("SELECT count(*) AS count FROM setting", (err, res) => {
    if (err) return callback(err)
    console.log('count:', res.rows[0].count)
    callback()
  })
}

// run the function in a transaction
pgtrans(
  pool,
  selCount,
  (err) => {
    if (err) {
      console.warn('' + err)
    }
    // end the pool so the program can quit
    pool.end()
  }
)
```

Inside the function you pass to `pgtrans` you can perform as many SQL
operations as you require. Just call `callback()` with an error to rollback the
transaction. If there was no error `pgtrans` will commit instead.

## AUTHOR ##

Written by [Andrew Chilton](https://chilts.me/):

* [Blog](https://chilts.org/)
* [GitHub](https://github.com/chilts)
* [Twitter](https://twitter.com/andychilton)
* [Instagram](http://instagram.com/thechilts)

# License #

ISC

(Ends)

/**
 * MySQL Database Handler
 */
const envvar = require('envvar');
const knex = require('knex')({
  client: 'mysql',
  connection: {
    host: envvar.string('AWS_MYSQL_HOST'),
    user: envvar.string('AWS_MYSQL_USERNAME'),
    password: envvar.string('AWS_MYSQL_PASSWORD'),
    database: envvar.string('AWS_MYSQL_DBNAME'),
  },
  pool: {min: 1, max: 1},
});

module.exports.knex = knex
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
const Objection = require('objection');
Model = Objection.Model;
Model.knex(knex);

function asTimestamp(field) {
  return Objection.raw(`UNIX_TIMESTAMP(${field})`);
}

function timestamp() {
  return Objection.raw(`FROM_UNIXTIME(${unixTimeStr()})`);
}
function unixTimeStr() {
  return String(Math.floor(Date.now() / 1000));
}

module.exports.knex = knex;
module.exports.Model = Model;
module.exports.timestamp = timestamp;
module.exports.asTimestamp = asTimestamp;


/**
 * MySQL Database Handler
 */
import * as Envvar from "envvar";
import { transaction, Model } from "objection";
import * as Knex from "knex";
const knex = Knex({
  client: "mysql",
  connection: {
    host: Envvar.string("AWS_MYSQL_HOST"),
    user: Envvar.string("AWS_MYSQL_USERNAME"),
    password: Envvar.string("AWS_MYSQL_PASSWORD"),
    database: Envvar.string("AWS_MYSQL_DBNAME")
  },
  pool: { min: 1, max: 1 }
});

Model.knex(knex);

export { knex };
export { Model };
export { transaction };

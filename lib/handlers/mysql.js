"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * MySQL Database Handler
 */
var Envvar = require("envvar");
var objection_1 = require("objection");
exports.transaction = objection_1.transaction;
exports.Model = objection_1.Model;
var Knex = require("knex");
var knex = Knex({
    client: "mysql",
    connection: {
        host: Envvar.string("AWS_MYSQL_HOST"),
        user: Envvar.string("AWS_MYSQL_USERNAME"),
        password: Envvar.string("AWS_MYSQL_PASSWORD"),
        database: Envvar.string("AWS_MYSQL_DBNAME")
    },
    pool: { min: 1, max: 1 }
});
exports.knex = knex;
objection_1.Model.knex(knex);

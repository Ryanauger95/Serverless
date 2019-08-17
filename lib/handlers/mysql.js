"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
var BaseModel = /** @class */ (function (_super) {
    __extends(BaseModel, _super);
    function BaseModel() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Object.defineProperty(BaseModel, "transaction", {
        get: function () {
            return objection_1.transaction;
        },
        enumerable: true,
        configurable: true
    });
    return BaseModel;
}(objection_1.Model));
exports.BaseModel = BaseModel;

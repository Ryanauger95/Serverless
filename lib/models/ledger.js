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
var mysql_1 = require("../handlers/mysql");
var LEDGER_STATE = {
    FAILED: -1,
    PENDING: 0,
    COMPLETED: 1
};
exports.LEDGER_STATE = LEDGER_STATE;
var SILA_HANDLE = "SILA_ISSUED";
exports.SILA_HANDLE = SILA_HANDLE;
var Ledger = /** @class */ (function (_super) {
    __extends(Ledger, _super);
    function Ledger() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Object.defineProperty(Ledger, "tableName", {
        // The insert function simply requires that
        // we first insure that no other entry
        // has app_users_id & active = 1
        get: function () {
            return "ledger";
        },
        enumerable: true,
        configurable: true
    });
    return Ledger;
}(mysql_1.Model));
exports.Ledger = Ledger;
//# sourceMappingURL=ledger.js.map
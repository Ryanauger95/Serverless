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
// Import DB Connection
var mysql_1 = require("../handlers/mysql");
var User = /** @class */ (function (_super) {
    __extends(User, _super);
    function User() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Object.defineProperty(User, "tableName", {
        // Table name is the only required property.
        get: function () {
            return "app_users";
        },
        enumerable: true,
        configurable: true
    });
    return User;
}(mysql_1.Model));
exports.User = User;
function updatePhone(userId, phone, OTC) {
    return User.query()
        .findById(userId)
        .update({
        phone: phone,
        phone_validated: false,
        phone_otc: OTC,
        phone_otc_ts: new Date()
    });
}
exports.updatePhone = updatePhone;
function getPhoneValidation(userId) {
    return User.query()
        .findById(userId)
        .select(["phone_otc", "phone_otc_ts"]);
}
exports.getPhoneValidation = getPhoneValidation;

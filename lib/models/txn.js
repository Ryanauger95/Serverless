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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var mysql_1 = require("../handlers/mysql");
var wallet_1 = require("./wallet");
var DEAL_STATE;
(function (DEAL_STATE) {
    DEAL_STATE[DEAL_STATE["DISPUTE"] = -3] = "DISPUTE";
    DEAL_STATE[DEAL_STATE["TIMEOUT"] = -2] = "TIMEOUT";
    DEAL_STATE[DEAL_STATE["CANCELLED"] = -1] = "CANCELLED";
    DEAL_STATE[DEAL_STATE["PENDING"] = 0] = "PENDING";
    DEAL_STATE[DEAL_STATE["PROGRESS"] = 1] = "PROGRESS";
    DEAL_STATE[DEAL_STATE["REVIEW"] = 2] = "REVIEW";
    DEAL_STATE[DEAL_STATE["FINISHED"] = 3] = "FINISHED";
})(DEAL_STATE || (DEAL_STATE = {}));
exports.DEAL_STATE = DEAL_STATE;
var FUND_STATE;
(function (FUND_STATE) {
    FUND_STATE[FUND_STATE["NOT_FUNDED"] = 0] = "NOT_FUNDED";
    FUND_STATE[FUND_STATE["ISSUE_PENDING"] = 1] = "ISSUE_PENDING";
    FUND_STATE[FUND_STATE["ISSUE_COMPLETE"] = 2] = "ISSUE_COMPLETE";
    FUND_STATE[FUND_STATE["TO_FBO_TRANSFER_PENDING"] = 3] = "TO_FBO_TRANSFER_PENDING";
    FUND_STATE[FUND_STATE["TO_FBO_TRANSFER_COMPLETE"] = 4] = "TO_FBO_TRANSFER_COMPLETE";
    FUND_STATE[FUND_STATE["FROM_FBO_TRANSFER_PENDING"] = 5] = "FROM_FBO_TRANSFER_PENDING";
    FUND_STATE[FUND_STATE["FROM_FBO_TRANSFER_COMPLETE"] = 6] = "FROM_FBO_TRANSFER_COMPLETE";
})(FUND_STATE || (FUND_STATE = {}));
exports.FUND_STATE = FUND_STATE;
var DEAL_ROLE = {
    SENDER: 0,
    RECEIVER: 1
};
exports.DEAL_ROLE = DEAL_ROLE;
var Txn = /** @class */ (function (_super) {
    __extends(Txn, _super);
    function Txn() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Object.defineProperty(Txn, "tableName", {
        get: function () {
            return "txn";
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Txn, "virtualAttributes", {
        // total is amount + fee + arb fee
        get: function () {
            return ["total"];
        },
        enumerable: true,
        configurable: true
    });
    Txn.prototype.total = function () {
        var txn = this;
        return txn.amount + txn.start_fee;
    };
    Object.defineProperty(Txn, "relationMappings", {
        get: function () {
            var User = require("./user").User;
            return {
                payer: {
                    relation: mysql_1.BaseModel.BelongsToOneRelation,
                    modelClass: User,
                    join: {
                        from: "txn.payer_id",
                        to: "app_users.id"
                    }
                },
                wallet: {
                    relation: mysql_1.BaseModel.ManyToManyRelation,
                    modelClass: wallet_1.SilaWallet,
                    join: {
                        from: "txn.payer_id",
                        through: {
                            from: "app_users.id",
                            to: "sila_wallet.app_users_id"
                        },
                        to: "sila_wallet.address"
                    }
                }
            };
        },
        enumerable: true,
        configurable: true
    });
    Txn.saveNew = function (amount, reserve, description, payer, collector, originator, period) {
        var _this = this;
        return mysql_1.knex.transaction(function (trx) { return __awaiter(_this, void 0, void 0, function () {
            var txnId, fee_id, holding_id;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, trx("txn").insert({
                            amount: amount,
                            reserve: reserve,
                            description: description,
                            payer_id: payer,
                            collector_id: collector,
                            originator_id: originator
                        })];
                    case 1:
                        txnId = (_a.sent())[0];
                        console.log("Txn_id: ", txnId);
                        return [4 /*yield*/, fee(trx, amount, txnId)];
                    case 2:
                        fee_id = (_a.sent())[0];
                        console.log("fee id: ", fee_id);
                        return [4 /*yield*/, holdingPeriod(trx, period, txnId)];
                    case 3:
                        holding_id = (_a.sent())[0];
                        console.log("holding id: ", holding_id.insertId);
                        return [2 /*return*/, txnId];
                }
            });
        }); });
    };
    Txn.updateFundState = function (txnId, newState, trx) {
        return Txn.query(trx)
            .findById(txnId)
            .update({ fund_state: newState });
    };
    return Txn;
}(mysql_1.BaseModel));
exports.Txn = Txn;
function retreive(txnId) {
    return mysql_1.knex("txn")
        .select("*")
        .where({ id: txnId });
}
exports.retreive = retreive;
function fee(driver, amount, txnId) {
    return driver("fee_schedule").insert({ total_fee: amount, txn_id: txnId });
}
function holdingPeriod(trx, period, txnId) {
    var date = new Date();
    var dueDate = date.setDate(date.getDate() + period);
    return trx("holding_period").insert({
        period: period,
        due_date: dueDate,
        txn_id: txnId
    });
}

"use strict";
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
var txn_1 = require("../lib/models/txn");
var ledger_1 = require("../lib/models/ledger");
var bankController = require("../lib/controllers/sila.js");
var common_1 = require("./common");
// For each transaction that is not funded,
// if the payer DOES NOT have enough money,
// then issue funds into their account
function issueFunds() {
    return __awaiter(this, void 0, void 0, function () {
        var txns, i, txn, effectiveBalance, fundsRequired, res, trx, err_1, err_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 15, , 16]);
                    return [4 /*yield*/, common_1.fetchTransactions(txn_1.FUND_STATE.NOT_FUNDED)];
                case 1:
                    txns = _a.sent();
                    console.log("#Txns: " + txns.length);
                    i = 0;
                    _a.label = 2;
                case 2:
                    if (!(i < txns.length)) return [3 /*break*/, 14];
                    txn = txns[i];
                    effectiveBalance = txn.payer_active_balance + txn.payer_pending_balance;
                    if (!(txn.payer_active_balance >= txn.amount)) return [3 /*break*/, 4];
                    console.log("TXN(" + txn.id + ") NOT_FUNDED -> ISSUE_COMPLETE");
                    return [4 /*yield*/, txn_1.Txn.updateFundState(txn.id, txn_1.FUND_STATE.ISSUE_COMPLETE)];
                case 3:
                    _a.sent();
                    return [3 /*break*/, 13];
                case 4:
                    if (!(effectiveBalance >= txn.amount)) return [3 /*break*/, 6];
                    console.log("TXN(" + txn.id + ") NOT_FUNDED -> ISSUE_PENDING");
                    return [4 /*yield*/, txn_1.Txn.updateFundState(txn.id, txn_1.FUND_STATE.ISSUE_PENDING)];
                case 5:
                    _a.sent();
                    return [3 /*break*/, 13];
                case 6:
                    fundsRequired = txn.amount - effectiveBalance;
                    console.log("TXN(" + txn.id + ") issuing " + fundsRequired);
                    return [4 /*yield*/, bankController.issueSila(fundsRequired, txn.payer_handle)];
                case 7:
                    res = _a.sent();
                    console.log("Issue Sila Result: ", res);
                    if (res.status != "SUCCESS") {
                        throw Error(res);
                    }
                    _a.label = 8;
                case 8:
                    _a.trys.push([8, 12, , 13]);
                    return [4 /*yield*/, ledger_1.Ledger.transaction.start(ledger_1.Ledger.knex())];
                case 9:
                    trx = _a.sent();
                    return [4 /*yield*/, ledger_1.Ledger.insertLedgerAndUpdateBalanceTrx(trx, txn.payer_handle, ledger_1.SILA_HANDLE, res.reference, ledger_1.LEDGER_TYPE.ISSUE, fundsRequired, ledger_1.LEDGER_STATE.PENDING, txn.id)];
                case 10:
                    _a.sent();
                    return [4 /*yield*/, txn_1.Txn.updateFundState(txn.id, txn_1.FUND_STATE.ISSUE_PENDING, trx)];
                case 11:
                    _a.sent();
                    trx.commit();
                    return [3 /*break*/, 13];
                case 12:
                    err_1 = _a.sent();
                    trx.rollback();
                    console.log("ISSUE,PAYER:" + txn.payer_handle + ",REFERENCE:" + res.reference + ",FUNDS:" + fundsRequired + ",TXN:" + txn.id);
                    console.log("Catastrophic Error: ", err_1);
                    return [3 /*break*/, 13];
                case 13:
                    i++;
                    return [3 /*break*/, 2];
                case 14: return [3 /*break*/, 16];
                case 15:
                    err_2 = _a.sent();
                    console.log("Error: ", err_2);
                    return [3 /*break*/, 16];
                case 16: return [2 /*return*/];
            }
        });
    });
}
exports.issueFunds = issueFunds;
// For each transaction that is ISSUE_PENDING,
// check the user balance and if the active balance
// is sufficient, move to ISSUE_COMPLETE
function checkIssued() {
    return __awaiter(this, void 0, void 0, function () {
        var txns, i, txn, effectiveBalance, err_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 9, , 10]);
                    return [4 /*yield*/, common_1.fetchTransactions(txn_1.FUND_STATE.ISSUE_PENDING)];
                case 1:
                    txns = _a.sent();
                    i = 0;
                    _a.label = 2;
                case 2:
                    if (!(i < txns.length)) return [3 /*break*/, 8];
                    txn = txns[i];
                    effectiveBalance = txn.payer_active_balance + txn.payer_pending_balance;
                    if (!(txn.payer_active_balance >= txn.amount)) return [3 /*break*/, 4];
                    console.log("TXN(" + txn.id + ") ISSUE_PENDING -> ISSUE_COMPLETE");
                    return [4 /*yield*/, txn_1.Txn.updateFundState(txn.id, txn_1.FUND_STATE.ISSUE_COMPLETE)];
                case 3:
                    _a.sent();
                    return [3 /*break*/, 7];
                case 4:
                    if (!(effectiveBalance >= txn.amount)) return [3 /*break*/, 5];
                    console.log("TXN(" + txn.id + ") ISSUE_PENDING UNCHANGED");
                    return [3 /*break*/, 7];
                case 5:
                    console.log("TXN(" + txn.id + ") ISSUE_PENDING -> NOT_FUNDED");
                    return [4 /*yield*/, txn_1.Txn.updateFundState(txn.id, txn_1.FUND_STATE.NOT_FUNDED)];
                case 6:
                    _a.sent();
                    _a.label = 7;
                case 7:
                    i++;
                    return [3 /*break*/, 2];
                case 8: return [3 /*break*/, 10];
                case 9:
                    err_3 = _a.sent();
                    console.log("Error: ", err_3);
                    return [3 /*break*/, 10];
                case 10: return [2 /*return*/];
            }
        });
    });
}
exports.checkIssued = checkIssued;
// Select all NOT_FUNDED
function fetchNotFundedTransactions() {
    return common_1.fetchTransactions(txn_1.FUND_STATE.NOT_FUNDED);
}

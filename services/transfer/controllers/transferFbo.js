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
var bankController = require("../lib/controllers/sila");
var ledger_2 = require("../lib/controllers/ledger");
var common_1 = require("./common");
function fundFbo() {
    return __awaiter(this, void 0, void 0, function () {
        var txns, i, txn, totals, fboActiveBalance, fboPendingBalance, fboEffectiveBalance, amountRemaining, payerActiveBalance, fboHandle, res, trx, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, common_1.fetchTransactions(txn_1.FUND_STATE.ISSUE_COMPLETE)];
                case 1:
                    txns = _a.sent();
                    console.log("#Txns: " + txns.length);
                    i = 0;
                    _a.label = 2;
                case 2:
                    if (!(i < txns.length)) return [3 /*break*/, 16];
                    txn = txns[i];
                    console.log("Txn: ", txn);
                    return [4 /*yield*/, ledger_2.totalTxn(txn.id)];
                case 3:
                    totals = _a.sent();
                    console.log("Totals: ", totals);
                    fboActiveBalance = totals.fbo.completed;
                    fboPendingBalance = totals.fbo.pending;
                    fboEffectiveBalance = fboActiveBalance + fboPendingBalance;
                    amountRemaining = txn.amount - fboEffectiveBalance;
                    payerActiveBalance = txn.payer_active_balance;
                    // Find how much the txn needs
                    console.log("TXN(" + txn.id + ") FBO requires $" + amountRemaining);
                    if (!(amountRemaining === 0)) return [3 /*break*/, 5];
                    console.log("TXN(" + txn.id + ") already funded!");
                    return [4 /*yield*/, txn_1.Txn.updateFundState(txn.id, txn_1.FUND_STATE.TO_FBO_TRANSFER_COMPLETE)];
                case 4:
                    _a.sent();
                    return [3 /*break*/, 15];
                case 5:
                    if (!(amountRemaining < 0)) return [3 /*break*/, 6];
                    // Do something
                    throw Error("Overfunded!");
                case 6:
                    if (!(amountRemaining > payerActiveBalance)) return [3 /*break*/, 8];
                    console.log("TXN(" + txn.id + ") ISSUE_COMPLETE -> NOT_FUNDED");
                    return [4 /*yield*/, txn_1.Txn.updateFundState(txn.id, txn_1.FUND_STATE.NOT_FUNDED)];
                case 7:
                    _a.sent();
                    return [3 /*break*/, 15];
                case 8:
                    fboHandle = bankController.fboHandle;
                    return [4 /*yield*/, bankController.transferSila(txn.payer_handle, fboHandle, amountRemaining)];
                case 9:
                    res = _a.sent();
                    console.log("Transfer Sila Res: ", res);
                    _a.label = 10;
                case 10:
                    _a.trys.push([10, 14, , 15]);
                    return [4 /*yield*/, ledger_1.Ledger.transaction.start(ledger_1.Ledger.knex())];
                case 11:
                    trx = _a.sent();
                    return [4 /*yield*/, ledger_1.Ledger.insertLedgerAndUpdateBalanceTrx(trx, fboHandle, txn.payer_handle, res.reference, ledger_1.LEDGER_TYPE.TRANSFER_TO_FBO, amountRemaining, ledger_1.LEDGER_STATE.PENDING, txn.id)];
                case 12:
                    _a.sent();
                    return [4 /*yield*/, txn_1.Txn.updateFundState(txn.id, txn_1.FUND_STATE.TO_FBO_TRANSFER_PENDING, trx)];
                case 13:
                    _a.sent();
                    trx.commit();
                    return [3 /*break*/, 15];
                case 14:
                    err_1 = _a.sent();
                    console.log("Catastrophic Error: ", err_1);
                    trx.rollback();
                    return [3 /*break*/, 15];
                case 15:
                    i++;
                    return [3 /*break*/, 2];
                case 16: return [2 /*return*/];
            }
        });
    });
}
exports.fundFbo = fundFbo;
function checkFundFbo() {
    return __awaiter(this, void 0, void 0, function () {
        var txns, i, txn, totals, fboActiveBalance, fboPendingBalance, fboEffectiveBalance, amountRemaining, payerActiveBalance;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, common_1.fetchTransactions(txn_1.FUND_STATE.TO_FBO_TRANSFER_PENDING)];
                case 1:
                    txns = _a.sent();
                    console.log("#Txns: " + txns.length);
                    i = 0;
                    _a.label = 2;
                case 2:
                    if (!(i < txns.length)) return [3 /*break*/, 9];
                    txn = txns[i];
                    console.log("Txn: ", txn);
                    return [4 /*yield*/, ledger_2.totalTxn(txn.id)];
                case 3:
                    totals = _a.sent();
                    console.log("Totals: ", totals);
                    fboActiveBalance = totals.fbo.completed;
                    fboPendingBalance = totals.fbo.pending;
                    fboEffectiveBalance = fboActiveBalance + fboPendingBalance;
                    amountRemaining = txn.amount - fboEffectiveBalance;
                    payerActiveBalance = txn.payer_active_balance;
                    if (!(fboActiveBalance >= txn.amount)) return [3 /*break*/, 5];
                    console.log("TXN(" + txn.id + ") TO_FBO_TRANSFER_PENDING -> TO_FBO_TRANSFER_COMPLETE");
                    return [4 /*yield*/, txn_1.Txn.updateFundState(txn.id, txn_1.FUND_STATE.TO_FBO_TRANSFER_COMPLETE)];
                case 4:
                    _a.sent();
                    return [3 /*break*/, 8];
                case 5:
                    if (!(fboEffectiveBalance >= txn.amount)) return [3 /*break*/, 6];
                    console.log("TXN(" + txn.id + ") TO_FBO_TRANSFER_PENDING UNCHANGED");
                    return [3 /*break*/, 8];
                case 6:
                    console.log("TXN(" + txn.id + ") TO_FBO_TRANSFER_PENDING -> ISSUE_COMPLETE");
                    return [4 /*yield*/, txn_1.Txn.updateFundState(txn.id, txn_1.FUND_STATE.ISSUE_COMPLETE)];
                case 7:
                    _a.sent();
                    _a.label = 8;
                case 8:
                    i++;
                    return [3 /*break*/, 2];
                case 9: return [2 /*return*/];
            }
        });
    });
}
exports.checkFundFbo = checkFundFbo;

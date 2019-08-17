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
var wallet_1 = require("../lib/models/wallet");
var txn_1 = require("../lib/models/txn");
var ledger_1 = require("../lib/models/ledger");
var bankController = require("../lib/controllers/sila.js");
// For each transaction that is not funded,
// if the payer DOES NOT have enough money,
// then issue funds into their account
function issueFunds() {
    return __awaiter(this, void 0, void 0, function () {
        var txns, _loop_1, i, state_1, err_1;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, fetchNotFundedTransactions()];
                case 1:
                    txns = _a.sent();
                    console.log("Un-Funded Transactions: ", txns);
                    _loop_1 = function () {
                        var txn = txns[i];
                        var effectiveBalance = txn.payer_active_balance + txn.payer_pending_balance;
                        // If the user has enough in their account, we
                        // do NOT fund the account
                        if (effectiveBalance >= txn.amount) {
                            console.log("User has enough funds in the account(" + txn.payer_active_balance + ")/pending(" + txn.payer_pending_balance + ") to cover the amount(" + txn.amount + ")");
                            return { value: void 0 };
                        }
                        // Else, fund the payer
                        var fundsRequired = txn.amount - effectiveBalance;
                        bankController
                            .issueSila(fundsRequired, txn.payer_handle)
                            .then(function (res) { return __awaiter(_this, void 0, void 0, function () {
                            var trx, err_2;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        console.log("Issue Sila Result: ", res);
                                        _a.label = 1;
                                    case 1:
                                        _a.trys.push([1, 5, , 6]);
                                        return [4 /*yield*/, ledger_1.Ledger.transaction.start(ledger_1.Ledger.knex())];
                                    case 2:
                                        trx = _a.sent();
                                        return [4 /*yield*/, ledger_1.Ledger.insertLedgerAndUpdateBalance(trx, txn.payer_handle, ledger_1.SILA_HANDLE, res.reference, ledger_1.LEDGER_TYPE.ISSUE, fundsRequired, ledger_1.LEDGER_STATE.PENDING, txn.id)];
                                    case 3:
                                        _a.sent();
                                        return [4 /*yield*/, txn_1.Txn.query(trx)
                                                .findById(txn.id)
                                                .patch({
                                                fund_state: txn_1.FUND_STATE.ISSUE_PENDING
                                            })];
                                    case 4:
                                        _a.sent();
                                        trx.commit();
                                        return [3 /*break*/, 6];
                                    case 5:
                                        err_2 = _a.sent();
                                        trx.rollback();
                                        console.log("ISSUE,PAYER:" + txn.payer_handle + ",REFERENCE:" + res.reference + ",FUNDS:" + fundsRequired + ",TXN:" + txn.id);
                                        console.log("Catastrophic Error: ", err_2);
                                        return [3 /*break*/, 6];
                                    case 6: return [2 /*return*/];
                                }
                            });
                        }); });
                    };
                    // If active balance + pending balance < amount, issue funds
                    for (i = 0; i < txns.length; i++) {
                        state_1 = _loop_1();
                        if (typeof state_1 === "object")
                            return [2 /*return*/, state_1.value];
                    }
                    return [3 /*break*/, 3];
                case 2:
                    err_1 = _a.sent();
                    console.log("Error: ", err_1);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
exports.issueFunds = issueFunds;
// Select all transactions in which
// 1) The payer's KYC has completed and
// 2) The txn is in a NOT_FUNDED state
function fetchNotFundedTransactions() {
    return txn_1.Txn.query()
        .select([
        "txn.*",
        "payer_wallet.handle as payer_handle",
        "payer_wallet.active_balance as payer_active_balance",
        "payer_wallet.pending_balance as payer_pending_balance"
    ])
        .join("sila_wallet as payer_wallet", "txn.payer_id", "payer_wallet.app_users_id")
        .where({
        "txn.fund_state": txn_1.FUND_STATE["NOT_FUNDED"],
        "payer_wallet.active": true,
        "payer_wallet.kyc_state": wallet_1.KYC_STATE["COMPLETED"],
        "payer_wallet.bank_linked": true
    });
}
// Return the total amount of month transacted in the
// ledger
function checkLedger(txnId) {
    return __awaiter(this, void 0, void 0, function () {
        var totalFailed, totalPending, totalComplete, ledger, i, ledgerEntry;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    totalFailed = 0;
                    totalPending = 0;
                    totalComplete = 0;
                    return [4 /*yield*/, ledger_1.Ledger.query()
                            .select("*")
                            .where({ txn_id: txnId })];
                case 1:
                    ledger = _a.sent();
                    for (i = 0; i < ledger.length; i++) {
                        ledgerEntry = ledger[i];
                        if (ledgerEntry.state === ledger_1.LEDGER_STATE["PENDING"]) {
                            totalPending += ledgerEntry.amount;
                        }
                        else if (ledgerEntry.state === ledger_1.LEDGER_STATE["COMPLETED"]) {
                            totalComplete += ledgerEntry.amount;
                        }
                        else if (ledgerEntry.state === ledger_1.LEDGER_STATE["FAILED"]) {
                            totalFailed += ledgerEntry.amount;
                        }
                    }
                    return [2 /*return*/, { totalFailed: totalFailed, totalPending: totalPending, totalComplete: totalComplete }];
            }
        });
    });
}
// Mark Txn Funded
function markFunded(txnId) {
    return txn_1.Txn.query()
        .findById(txnId)
        .patch({ fund_state: txn_1.FUND_STATE["FUNDED"] });
}

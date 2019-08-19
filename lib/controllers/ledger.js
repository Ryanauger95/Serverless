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
var ledger_1 = require("../models/ledger");
var wallet_1 = require("../models/wallet");
// Return the total amount of money transacted in the
// ledger for a txn
function totalTxn(txnId) {
    return __awaiter(this, void 0, void 0, function () {
        var ledger, totals, i, ledgerEntry;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, ledger_1.Ledger.query()
                        .select("*")
                        .where({ txn_id: txnId })];
                case 1:
                    ledger = _a.sent();
                    totals = {
                        payer: {
                            pending: 0,
                            completed: 0,
                            failed: 0
                        },
                        fbo: {
                            pending: 0,
                            completed: 0,
                            failed: 0
                        },
                        collector: {
                            pending: 0,
                            completed: 0,
                            failed: 0
                        }
                    };
                    for (i = 0; i < ledger.length; i++) {
                        ledgerEntry = ledger[i];
                        switch (ledgerEntry.type) {
                            case ledger_1.LEDGER_TYPE.ISSUE: {
                                if (ledgerEntry.state == ledger_1.LEDGER_STATE.COMPLETED) {
                                    totals.payer.completed += ledgerEntry.amount;
                                }
                                else if (ledgerEntry.state == ledger_1.LEDGER_STATE.PENDING) {
                                    totals.payer.pending += ledgerEntry.amount;
                                }
                                else if (ledgerEntry.state == ledger_1.LEDGER_STATE.FAILED) {
                                    totals.payer.failed += ledgerEntry.amount;
                                }
                                break;
                            }
                            case ledger_1.LEDGER_TYPE.TRANSFER_TO_FBO: {
                                if (ledgerEntry.state == ledger_1.LEDGER_STATE.COMPLETED) {
                                    totals.payer.completed -= ledgerEntry.amount;
                                    totals.fbo.completed += ledgerEntry.amount;
                                }
                                else if (ledgerEntry.state == ledger_1.LEDGER_STATE.PENDING) {
                                    totals.payer.pending -= ledgerEntry.amount;
                                    totals.fbo.pending += ledgerEntry.amount;
                                }
                                else if (ledgerEntry.state == ledger_1.LEDGER_STATE.FAILED) {
                                    totals.fbo.failed += ledgerEntry.amount;
                                }
                                break;
                            }
                            case ledger_1.LEDGER_TYPE.TRANSFER_FROM_FBO: {
                                if (ledgerEntry.state == ledger_1.LEDGER_STATE.COMPLETED) {
                                    totals.fbo.completed -= ledgerEntry.amount;
                                    totals.collector.completed += ledgerEntry.amount;
                                }
                                else if (ledgerEntry.state == ledger_1.LEDGER_STATE.PENDING) {
                                    totals.fbo.pending -= ledgerEntry.amount;
                                    totals.collector.pending += ledgerEntry.amount;
                                }
                                else if (ledgerEntry.state == ledger_1.LEDGER_STATE.FAILED) {
                                    totals.fbo.failed += ledgerEntry.amount;
                                }
                                break;
                            }
                            case ledger_1.LEDGER_TYPE.REDEEM: {
                                if (ledgerEntry.state == ledger_1.LEDGER_STATE.COMPLETED) {
                                    totals.collector.completed -= ledgerEntry.amount;
                                }
                                else if (ledgerEntry.state == ledger_1.LEDGER_STATE.PENDING) {
                                    totals.collector.pending -= ledgerEntry.amount;
                                }
                                else if (ledgerEntry.state == ledger_1.LEDGER_STATE.FAILED) {
                                    totals.collector.failed += ledgerEntry.amount;
                                }
                                break;
                            }
                        }
                    }
                    return [2 /*return*/, totals];
            }
        });
    });
}
exports.totalTxn = totalTxn;
function transferType(fromHandle, toHandle) {
    return __awaiter(this, void 0, void 0, function () {
        var fboAccounts, i, account;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, wallet_1.SilaWallet.query()
                        .select("handle")
                        .where({ account_type: wallet_1.ACCOUNT_TYPE.FBO })];
                case 1:
                    fboAccounts = (_a.sent());
                    // Check if transfer to
                    for (i = 0; i < fboAccounts.length; i++) {
                        account = fboAccounts[i];
                        if (toHandle === account.handle) {
                            return [2 /*return*/, ledger_1.LEDGER_TYPE.TRANSFER_TO_FBO];
                        }
                        else if (fromHandle === account.handle) {
                            return [2 /*return*/, ledger_1.LEDGER_TYPE.TRANSFER_FROM_FBO];
                        }
                    }
                    return [2 /*return*/, ledger_1.LEDGER_TYPE.UNKNOWN];
            }
        });
    });
}
exports.transferType = transferType;

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
var wallet_1 = require("../models/wallet");
var LEDGER_STATE;
(function (LEDGER_STATE) {
    LEDGER_STATE[LEDGER_STATE["UNKNOWN"] = -2] = "UNKNOWN";
    LEDGER_STATE[LEDGER_STATE["FAILED"] = -1] = "FAILED";
    LEDGER_STATE[LEDGER_STATE["PENDING"] = 0] = "PENDING";
    LEDGER_STATE[LEDGER_STATE["COMPLETED"] = 1] = "COMPLETED";
})(LEDGER_STATE || (LEDGER_STATE = {}));
exports.LEDGER_STATE = LEDGER_STATE;
var LEDGER_TYPE;
(function (LEDGER_TYPE) {
    LEDGER_TYPE[LEDGER_TYPE["UNKNOWN"] = -1] = "UNKNOWN";
    LEDGER_TYPE[LEDGER_TYPE["ISSUE"] = 0] = "ISSUE";
    LEDGER_TYPE[LEDGER_TYPE["TRANSFER_TO_FBO"] = 1] = "TRANSFER_TO_FBO";
    LEDGER_TYPE[LEDGER_TYPE["TRANSFER_FROM_FBO"] = 2] = "TRANSFER_FROM_FBO";
    LEDGER_TYPE[LEDGER_TYPE["REDEEM"] = 3] = "REDEEM";
})(LEDGER_TYPE || (LEDGER_TYPE = {}));
exports.LEDGER_TYPE = LEDGER_TYPE;
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
    // ACID transaction for updating the ledger and
    // wallets' pending and active balances
    // NOTE: All ledger updates must run through this function
    // so that balance updates are properly made
    Ledger.insertLedgerAndUpdateBalance = function (toHandle, fromHandle, reference, type, amount, state, txnId) {
        return __awaiter(this, void 0, void 0, function () {
            var trx, err_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, Ledger.transaction.start(Ledger.knex())];
                    case 1:
                        trx = _a.sent();
                        return [4 /*yield*/, this.insertLedgerAndUpdateBalanceTrx(trx, toHandle, fromHandle, reference, type, amount, state, txnId)];
                    case 2:
                        _a.sent();
                        trx.commit();
                        return [3 /*break*/, 4];
                    case 3:
                        err_1 = _a.sent();
                        trx.rollback();
                        throw Error("Error adding!");
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    Ledger.insertLedgerAndUpdateBalanceTrx = function (trx, toHandle, fromHandle, reference, type, amount, state, txnId) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, balanceType, patchJSON, balanceType, patchJSON, balanceType, patchToHandleJSON, balanceType, patchFromHandleJSON;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, Ledger.query(trx).insert({
                            to_handle: toHandle,
                            from_handle: fromHandle,
                            reference: reference,
                            type: type,
                            amount: amount,
                            state: state,
                            txn_id: txnId
                        })];
                    case 1:
                        _b.sent();
                        // If the state is failed, and it doesnt already exits,
                        // then we don't have to worry about users' balances
                        if (state === LEDGER_STATE.FAILED) {
                            return [2 /*return*/];
                        }
                        _a = type;
                        switch (_a) {
                            case LEDGER_TYPE.ISSUE: return [3 /*break*/, 2];
                            case LEDGER_TYPE.REDEEM: return [3 /*break*/, 4];
                            case LEDGER_TYPE.TRANSFER_TO_FBO: return [3 /*break*/, 6];
                            case LEDGER_TYPE.TRANSFER_FROM_FBO: return [3 /*break*/, 6];
                        }
                        return [3 /*break*/, 9];
                    case 2:
                        balanceType = state === LEDGER_STATE.COMPLETED
                            ? "active_balance"
                            : "pending_balance";
                        patchJSON = {};
                        patchJSON[balanceType] = this.raw(balanceType + " + " + String(amount));
                        return [4 /*yield*/, wallet_1.SilaWallet.query(trx)
                                .patch(patchJSON)
                                .where({
                                handle: toHandle
                            })];
                    case 3:
                        _b.sent();
                        return [3 /*break*/, 9];
                    case 4:
                        balanceType = state === LEDGER_STATE.COMPLETED
                            ? "active_balance"
                            : "pending_balance";
                        patchJSON = {};
                        patchJSON[balanceType] = this.raw(balanceType + " - " + String(amount));
                        return [4 /*yield*/, wallet_1.SilaWallet.query(trx)
                                .patch(patchJSON)
                                .where({
                                handle: fromHandle
                            })];
                    case 5:
                        _b.sent();
                        return [3 /*break*/, 9];
                    case 6:
                        balanceType = state === LEDGER_STATE.COMPLETED
                            ? "active_balance"
                            : "pending_balance";
                        patchToHandleJSON = {};
                        patchToHandleJSON[balanceType] = this.raw(balanceType + " + " + String(amount));
                        return [4 /*yield*/, wallet_1.SilaWallet.query(trx)
                                .patch(patchToHandleJSON)
                                .where({
                                handle: toHandle
                            })];
                    case 7:
                        _b.sent();
                        balanceType = state === LEDGER_STATE.COMPLETED
                            ? "active_balance"
                            : "pending_balance";
                        patchFromHandleJSON = {};
                        patchFromHandleJSON[balanceType] = this.raw(balanceType + " - " + String(amount));
                        return [4 /*yield*/, wallet_1.SilaWallet.query(trx)
                                .patch(patchFromHandleJSON)
                                .where({
                                handle: fromHandle
                            })];
                    case 8:
                        _b.sent();
                        return [3 /*break*/, 9];
                    case 9: return [2 /*return*/];
                }
            });
        });
    };
    // ACID transaction for updating the ledger.
    // NOTE: All ledger updates must run through this function
    // so that balance updates are properly made
    Ledger.updateLedgerAndBalance = function (id, toHandle, fromHandle, reference, type, amount, state) {
        return __awaiter(this, void 0, void 0, function () {
            var trx, err_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, Ledger.transaction.start(Ledger.knex())];
                    case 1:
                        trx = _a.sent();
                        return [4 /*yield*/, this.updateLedgerAndBalanceTrx(trx, id, toHandle, fromHandle, reference, type, amount, state)];
                    case 2:
                        _a.sent();
                        trx.commit();
                        return [3 /*break*/, 4];
                    case 3:
                        err_2 = _a.sent();
                        trx.rollback();
                        throw Error("Error updating!");
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    Ledger.updateLedgerAndBalanceTrx = function (trx, id, toHandle, fromHandle, reference, type, amount, state) {
        return __awaiter(this, void 0, void 0, function () {
            var oldLedgerEntry, oldState, _a, patchJSON, patchJSON, patchToHandleJSON, patchFromHandleJSON;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, Ledger.query(trx).findById(id)];
                    case 1:
                        oldLedgerEntry = _b.sent();
                        oldState = oldLedgerEntry.state;
                        // If the states haven't actually changed, throw a big error
                        if (oldState == state) {
                            throw Error("States unchanged: old(" + oldState + ") new(" + state + ")!");
                        }
                        // If the states have changed from a completed or failed state,
                        // throw a major error
                        if (oldState !== LEDGER_STATE.PENDING ||
                            (state !== LEDGER_STATE.COMPLETED && state !== LEDGER_STATE.FAILED)) {
                            throw Error("States misaligned!");
                        }
                        // State Change validated.
                        // Update the ledger
                        return [4 /*yield*/, this.updateEntryState(trx, id, toHandle, fromHandle, reference, type, state)];
                    case 2:
                        // State Change validated.
                        // Update the ledger
                        _b.sent();
                        _a = type;
                        switch (_a) {
                            case LEDGER_TYPE.ISSUE: return [3 /*break*/, 3];
                            case LEDGER_TYPE.REDEEM: return [3 /*break*/, 5];
                            case LEDGER_TYPE.TRANSFER_TO_FBO: return [3 /*break*/, 7];
                            case LEDGER_TYPE.TRANSFER_FROM_FBO: return [3 /*break*/, 7];
                        }
                        return [3 /*break*/, 10];
                    case 3:
                        patchJSON = {
                            pending_balance: this.raw("pending_balance -" + String(amount))
                        };
                        if (state === LEDGER_STATE.COMPLETED) {
                            patchJSON["active_balance"] = this.raw("active_balance +" + String(amount));
                        }
                        return [4 /*yield*/, wallet_1.SilaWallet.query(trx)
                                .patch(patchJSON)
                                .where({
                                handle: toHandle
                            })];
                    case 4:
                        _b.sent();
                        return [3 /*break*/, 10];
                    case 5:
                        patchJSON = {
                            pending_balance: this.raw("pending_balance +" + String(amount))
                        };
                        if (state === LEDGER_STATE.COMPLETED) {
                            patchJSON["active_balance"] = this.raw("active_balance -" + String(amount));
                        }
                        return [4 /*yield*/, wallet_1.SilaWallet.query(trx)
                                .patch(patchJSON)
                                .where({
                                handle: fromHandle
                            })];
                    case 6:
                        _b.sent();
                        return [3 /*break*/, 10];
                    case 7:
                        patchToHandleJSON = {
                            pending_balance: this.raw("pending_balance -" + String(amount))
                        };
                        if (state === LEDGER_STATE.COMPLETED) {
                            patchToHandleJSON["active_balance"] = this.raw("active_balance +" + String(amount));
                        }
                        return [4 /*yield*/, wallet_1.SilaWallet.query(trx)
                                .patch(patchToHandleJSON)
                                .where({
                                handle: toHandle
                            })];
                    case 8:
                        _b.sent();
                        patchFromHandleJSON = {
                            pending_balance: this.raw("pending_balance +" + String(amount))
                        };
                        if (state === LEDGER_STATE.COMPLETED) {
                            patchFromHandleJSON["active_balance"] = this.raw("active_balance -" + String(amount));
                        }
                        return [4 /*yield*/, wallet_1.SilaWallet.query(trx)
                                .patch(patchFromHandleJSON)
                                .where({
                                handle: fromHandle
                            })];
                    case 9:
                        _b.sent();
                        return [3 /*break*/, 10];
                    case 10: return [2 /*return*/];
                }
            });
        });
    };
    // Update the ledger entry's state
    // This will fail if the entry DNE already
    // NOTE: This query ensures that all fields match except for
    // the state
    Ledger.updateEntryState = function (trx, id, toHandle, fromHandle, reference, type, state) {
        return __awaiter(this, void 0, void 0, function () {
            var res;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Update a ledger entry.
                        console.log("UPDATE:id=" + id + ",reference=" + reference + ",type=" + type + ",state=" + state + ",toHandle=" + toHandle + ",fromHandle=" + fromHandle);
                        return [4 /*yield*/, Ledger.query(trx)
                                .update({
                                state: state,
                                update_date: new Date()
                            })
                                .where({
                                id: id,
                                reference: reference,
                                type: type,
                                from_handle: fromHandle,
                                to_handle: toHandle
                            })
                                .andWhere("state", "!=", state)];
                    case 1:
                        res = _a.sent();
                        if (res === 0) {
                            throw Error("update failed!");
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    return Ledger;
}(mysql_1.BaseModel));
exports.Ledger = Ledger;

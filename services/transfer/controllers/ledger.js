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
var ledger_1 = require("../lib/models/ledger");
var sila_js_1 = require("../lib/controllers/sila.js");
/****************************************
 * EXTERNAL FUNCTIONS
 ****************************************/
/****************************************
 * updateLedgerEntries
 * For each ledger entry that is PENDING,
 * check to see if the state has changed
 * and update the state if it has
 ****************************************/
function updateLedgerEntries() {
    return __awaiter(this, void 0, void 0, function () {
        var ledgerPending, _loop_1, handle, i;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("Checking all pending transfers and updating their states...");
                    return [4 /*yield*/, ledger_1.Ledger.query()
                            .select("*")
                            .where({
                            state: ledger_1.LEDGER_STATE.PENDING
                        })];
                case 1:
                    ledgerPending = _a.sent();
                    console.log("pending ledger entries", ledgerPending);
                    _loop_1 = function () {
                        var pendingLedgerEntry = ledgerPending[i];
                        // Get all transactions associated with the ledger entry
                        // Then, update the state if it changed
                        // If there is an error, then it is a big error
                        handle = handleForType(pendingLedgerEntry);
                        sila_js_1.getTransactions(handle)
                            .then(function (_a) {
                            var transactions = _a.transactions;
                            return __awaiter(_this, void 0, void 0, function () {
                                var transaction, newLedgerState, oldLedgerState;
                                return __generator(this, function (_b) {
                                    switch (_b.label) {
                                        case 0:
                                            transaction = findTransaction(pendingLedgerEntry.reference, transactions);
                                            if (!transaction) {
                                                console.log("MASSIVE Error... Transaction not found!");
                                                return [2 /*return*/];
                                            }
                                            console.log("Transaction Matched: ", transaction);
                                            newLedgerState = transactionStateToLedgerState(transaction);
                                            oldLedgerState = pendingLedgerEntry.state;
                                            console.log("oldLedgerState(" + oldLedgerState + ") newLedgerState(" + newLedgerState + ")");
                                            if (!(newLedgerState != oldLedgerState)) return [3 /*break*/, 2];
                                            console.log("Updating state");
                                            return [4 /*yield*/, ledger_1.Ledger.updateLedgerAndBalance(pendingLedgerEntry.id, pendingLedgerEntry.to_handle, pendingLedgerEntry.from_handle, transaction.reference_id, pendingLedgerEntry.type, pendingLedgerEntry.amount, newLedgerState).catch(function (err) {
                                                    console.log("Error: ", err);
                                                })];
                                        case 1:
                                            _b.sent();
                                            _b.label = 2;
                                        case 2: return [2 /*return*/];
                                    }
                                });
                            });
                        })
                            .catch(function (err) {
                            console.log("Error retreiving transactions for handle: ", handle, " Error: ", err);
                        });
                    };
                    for (i = 0; i < ledgerPending.length; i++) {
                        _loop_1();
                    }
                    return [2 /*return*/];
            }
        });
    });
}
exports.updateLedgerEntries = updateLedgerEntries;
/****************************************
 * INTERNAL FUNCTIONS
 ****************************************/
// Search the list of txns for a user and return the transaction in question
// NOTE: This should be replaced by a getTransaction() call to our bank in the future
function findTransaction(referenceId, transactionArr) {
    console.log("len: ", transactionArr.length);
    for (var i = 0; i < transactionArr.length; i++) {
        var transfer = transactionArr[i];
        if (transfer.reference_id === referenceId) {
            return transfer;
        }
        console.log("Reference Id(" + transfer.reference_id + " != " + referenceId);
    }
    return null;
}
// NOTE: Right now, we are just using the TO_HANDLE in every
// case. BUT there will be an issue if we have to query an FBO account
// that has millions of entries.
function handleForType(ledgerEntry) {
    switch (ledgerEntry.type) {
        case ledger_1.LEDGER_TYPE.ISSUE: {
            return ledgerEntry.to_handle;
        }
        case ledger_1.LEDGER_TYPE.TRANSFER_TO_FBO:
        case ledger_1.LEDGER_TYPE.TRANSFER_FROM_FBO:
        case ledger_1.LEDGER_TYPE.REDEEM: {
            return ledgerEntry.from_handle;
        }
    }
}
// Translate the bank verbiage into our state verbiage
function transactionStateToLedgerState(transaction) {
    switch (transaction.status) {
        case "failed": {
            return ledger_1.LEDGER_STATE["FAILED"];
        }
        case "pending": {
            return ledger_1.LEDGER_STATE["PENDING"];
        }
        case "success": {
            return ledger_1.LEDGER_STATE["COMPLETED"];
        }
        default: {
            return ledger_1.LEDGER_STATE["UNKNOWN"];
        }
    }
}

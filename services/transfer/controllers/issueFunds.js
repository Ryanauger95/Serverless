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
// if the payer is lacking funds
function issueFunds() {
    return __awaiter(this, void 0, void 0, function () {
        var txns, i, txn, _a, totalFailed, totalPending, totalComplete, fundAmount, issueResult, reference, err_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 12, , 13]);
                    return [4 /*yield*/, fetchNotFundedTransactions()];
                case 1:
                    txns = _b.sent();
                    console.log("Un-Funded Transactions: ", txns);
                    i = 0;
                    _b.label = 2;
                case 2:
                    if (!(i < txns.length)) return [3 /*break*/, 11];
                    txn = txns[i];
                    return [4 /*yield*/, checkLedger(txn.id)];
                case 3:
                    _a = _b.sent(), totalFailed = _a.totalFailed, totalPending = _a.totalPending, totalComplete = _a.totalComplete;
                    console.log("Failed = " + totalFailed + ", \t Pending = " + totalPending + ", \t Completed = " + totalComplete);
                    return [3 /*break*/, 10];
                case 4:
                    if (!(totalPending + totalComplete > txn.amount)) return [3 /*break*/, 5];
                    throw Error("Overfunded!");
                case 5:
                    if (!(totalPending + totalComplete === txn.amount)) return [3 /*break*/, 6];
                    throw Error("Transaction is funded, should not get here");
                case 6:
                    if (!(totalPending + totalComplete < txn.amount)) return [3 /*break*/, 10];
                    console.log("Issuing $ into the user's account");
                    fundAmount = txn.amount - totalPending - totalComplete;
                    console.log("Issuing " + fundAmount + " into user's wallet");
                    return [4 /*yield*/, bankController.issueSila(fundAmount, txn.payer_handle, txn.payer_private_key)];
                case 7:
                    issueResult = _b.sent();
                    console.log("IssueSila Result ", issueResult);
                    if (issueResult.status != "SUCCESS") {
                        throw Error("Issue money failed");
                    }
                    reference = issueResult.reference;
                    console.log("Saving ledger entry into the user's account");
                    // 2) Enter the value into the ledger
                    return [4 /*yield*/, ledger_1.Ledger.query().insert({
                            from_handle: ledger_1.SILA_HANDLE,
                            to_handle: txn.payer_handle,
                            amount: fundAmount,
                            state: ledger_1.LEDGER_STATE["PENDING"],
                            reference: reference,
                            txn_id: txn.id
                        })];
                case 8:
                    // 2) Enter the value into the ledger
                    _b.sent();
                    // Mark Txn as funded
                    return [4 /*yield*/, markFunded(txn.id)];
                case 9:
                    // Mark Txn as funded
                    _b.sent();
                    _b.label = 10;
                case 10:
                    i++;
                    return [3 /*break*/, 2];
                case 11: return [3 /*break*/, 13];
                case 12:
                    err_1 = _b.sent();
                    console.log("Error: ", err_1);
                    return [3 /*break*/, 13];
                case 13: return [2 /*return*/];
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
        "payer_wallet.private_key as payer_private_key"
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
//# sourceMappingURL=issueFunds.js.map
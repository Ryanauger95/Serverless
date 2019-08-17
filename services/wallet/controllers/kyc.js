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
var bankController = require("../lib/controllers/sila");
var _a = require("../lib/models/wallet"), SilaWallet = _a.SilaWallet, KYC_STATE = _a.KYC_STATE;
var SNS = require("../lib/handlers/sns");
function checkAll() {
    return __awaiter(this, void 0, void 0, function () {
        var wallets, promises, incrementPromises, i, wallet, i, wallet, res, kycState, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 10, , 11]);
                    return [4 /*yield*/, SilaWallet.query()
                            .select("*")
                            .where({ active: 1, kyc_state: KYC_STATE["PENDING"] })];
                case 1:
                    wallets = _a.sent();
                    console.log(wallets);
                    promises = [];
                    incrementPromises = [];
                    // Run Check KYC asynchronously and put the promises into an array
                    for (i = 0; i < wallets.length; i++) {
                        wallet = wallets[i];
                        promises[i] = bankController.checkKYC(wallet.handle, wallet.private_key);
                        // Increment the field for the # of times we've polled KYC
                        incrementPromises[i] = SilaWallet.query()
                            .increment("kyc_poll_count", 1)
                            .where({ address: wallet.address });
                    }
                    i = 0;
                    _a.label = 2;
                case 2:
                    if (!(i < wallets.length)) return [3 /*break*/, 9];
                    wallet = wallets[i];
                    return [4 /*yield*/, promises[i]];
                case 3:
                    res = _a.sent();
                    return [4 /*yield*/, incrementPromises[i]];
                case 4:
                    _a.sent();
                    kycState = decodeState(res.status, res.message);
                    // If the state has changed, write it to the database.
                    // and publish to an SNS topic
                    if (kycState === KYC_STATE["PENDING"]) {
                        bankController
                            .requestKYC({ handle: wallet.handle }, wallet.private_key)
                            .then(function (res) {
                            console.log("requestKYC success: ", res);
                        })
                            .catch(function (res) {
                            console.log("requestKYC failed: ", res);
                        });
                    }
                    if (!(kycState != wallet.kyc_state)) return [3 /*break*/, 7];
                    console.log("KYC State changed from ", wallet.kyc_state, " to ", kycState);
                    return [4 /*yield*/, SilaWallet.query()
                            .update({ kyc_state: kycState })
                            .where({ address: wallet.address })];
                case 5:
                    _a.sent();
                    return [4 /*yield*/, SNS.publish("user-wallet-kyc_changed", JSON.stringify({
                            user_id: wallet.app_users_id,
                            address: wallet.address,
                            handle: wallet.handle,
                            old_kyc_state: wallet.kyc_state,
                            kyc_state: kycState
                        }))];
                case 6:
                    _a.sent();
                    _a.label = 7;
                case 7:
                    console.log("Finished KYC(", kycState, ") Check for user: ", wallet.app_users_id);
                    _a.label = 8;
                case 8:
                    i++;
                    return [3 /*break*/, 2];
                case 9:
                    console.log("Finished KYC check for ", wallets.length, " users");
                    return [3 /*break*/, 11];
                case 10:
                    err_1 = _a.sent();
                    console.log("Caught Error: ", err_1);
                    return [3 /*break*/, 11];
                case 11: return [2 /*return*/];
            }
        });
    });
}
exports.checkAll = checkAll;
function decodeState(status, message) {
    var kycState = KYC_STATE["FAILED"];
    console.log("KYC message: ", message);
    if (status == "SUCCESS") {
        kycState = KYC_STATE["COMPLETED"];
        // All cases afterwards presume 'FAILURE' status code
    }
    else if (message.includes("pending")) {
        kycState = KYC_STATE["PENDING"];
    }
    else if (message.includes("failed")) {
        kycState = KYC_STATE["FAILED"];
    }
    else {
        kycState = KYC_STATE["UNKNOWN"];
    }
    return kycState;
}

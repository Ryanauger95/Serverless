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
var Joi = require("joi");
var SilaWallet = require("../lib/models/wallet").SilaWallet;
var bankController = require("../lib/controllers/sila");
var parseAndValidate = require("../lib/handlers/bodyParser").parseAndValidate;
// POST Body format validator
var schema = Joi.object().keys({
    public_token: Joi.string().required()
});
function link(event) {
    return __awaiter(this, void 0, void 0, function () {
        var response, body, userId, wallet, publicToken, handle, key, linkAccount, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    response = { statusCode: 400 };
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 5, , 6]);
                    console.log("Event: ", event);
                    body = parseAndValidate(event.body, schema);
                    userId = event["pathParameters"]["user_id"];
                    return [4 /*yield*/, SilaWallet.query()
                            .select("*")
                            .where({ active: 1, app_users_id: userId })];
                case 2:
                    wallet = (_a.sent())[0];
                    publicToken = body.public_token;
                    handle = wallet.handle;
                    key = wallet.private_key;
                    return [4 /*yield*/, bankController.linkAccount(handle, key, publicToken)];
                case 3:
                    linkAccount = _a.sent();
                    if (!linkAccount || linkAccount.status != "SUCCESS") {
                        console.log("Account link error: ", linkAccount);
                        throw Error("Failed to link account");
                    }
                    // Untested
                    return [4 /*yield*/, SilaWallet.query()
                            .patch({ bank_linked: true })
                            .where({ handle: handle })];
                case 4:
                    // Untested
                    _a.sent();
                    response.statusCode = 200;
                    return [3 /*break*/, 6];
                case 5:
                    err_1 = _a.sent();
                    console.log("Account link error: ", err_1);
                    return [3 /*break*/, 6];
                case 6: return [2 /*return*/, response];
            }
        });
    });
}
exports.link = link;
function get(event) {
    return __awaiter(this, void 0, void 0, function () {
        var response, userId, wallet, handle, privateKey, silaAccounts, err_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    response = { statusCode: 400, body: "" };
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    console.log("Event: ", event);
                    userId = event["pathParameters"]["user_id"];
                    return [4 /*yield*/, SilaWallet.query()
                            .select("*")
                            .where({ active: 1, app_users_id: userId })];
                case 2:
                    wallet = (_a.sent())[0];
                    handle = wallet.handle;
                    privateKey = wallet.private_key;
                    return [4 /*yield*/, bankController.getAccounts(handle, privateKey)];
                case 3:
                    silaAccounts = _a.sent();
                    console.log("silaAccounts: ", silaAccounts);
                    if (!silaAccounts) {
                        throw new Error("Failed to get accounts");
                    }
                    response.statusCode = 200;
                    response.body = JSON.stringify({ accounts: silaAccounts });
                    return [3 /*break*/, 5];
                case 4:
                    err_2 = _a.sent();
                    console.log("Account retreive Error: ", err_2);
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/, response];
            }
        });
    });
}
exports.get = get;

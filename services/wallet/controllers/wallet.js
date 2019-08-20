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
var parseAndValidate = require("../lib/handlers/bodyParser").parseAndValidate;
var User = require("../lib/models/user").User;
var SilaWallet = require("../lib/models/wallet").SilaWallet;
var bankController = require("../lib/controllers/sila");
var SNS = require("../lib/handlers/sns");
// POST Body format validator
var schema = Joi.object().keys({
    address_1: Joi.string().required(),
    address_2: Joi.string().allow(""),
    city: Joi.string().required(),
    state: Joi.string().required(),
    zip: Joi.number().required(),
    ssn: Joi.number()
        .integer()
        .required()
});
// Accepts the KYC information from the user.
// If the user exists, and does not have any active account,
// then we use the bank shem
function create(event) {
    return __awaiter(this, void 0, void 0, function () {
        var response, body, userId, user, wallet, res, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    response = { statusCode: 400, body: "" };
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 6, , 7]);
                    console.log("Event: ", event);
                    body = parseAndValidate(event.body, schema);
                    userId = event["pathParameters"]["user_id"];
                    return [4 /*yield*/, User.query().findById(userId)];
                case 2:
                    user = _a.sent();
                    console.log(user);
                    return [4 /*yield*/, SilaWallet.getActiveWallets(userId)];
                case 3:
                    wallet = _a.sent();
                    console.log("Active Wallets: ", wallet);
                    if (wallet.length > 0) {
                        throw Error("User already has an active wallet");
                    }
                    // Register with our banking provider
                    // Abstracted away banking provider into
                    // bankController
                    return [4 /*yield*/, bankController.register(userId, {
                            first_name: user.first_name,
                            last_name: user.last_name,
                            email: user.email,
                            phone: user.phone,
                            address: body.address_1,
                            address_2: body.address_2,
                            city: body.city,
                            state: body.state,
                            zip: String(body.zip),
                            ssn: String(body.ssn)
                        })];
                case 4:
                    // Register with our banking provider
                    // Abstracted away banking provider into
                    // bankController
                    _a.sent();
                    return [4 /*yield*/, SNS.publish("user-wallet-registered", JSON.stringify({
                            user_id: userId,
                            wallet: "sila"
                        }))];
                case 5:
                    res = _a.sent();
                    console.log("SNS Result: ", res);
                    // Build response
                    response.statusCode = 200;
                    response.body = JSON.stringify({ message: "Successfully Registered" });
                    return [3 /*break*/, 7];
                case 6:
                    err_1 = _a.sent();
                    console.log("Error: ", err_1);
                    response.body = JSON.stringify({ message: err_1.message });
                    return [3 /*break*/, 7];
                case 7: return [2 /*return*/, response];
            }
        });
    });
}
exports.create = create;
function fetch(event) {
    return __awaiter(this, void 0, void 0, function () {
        var response, userId, wallet, err_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    response = { statusCode: 400, body: "" };
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    console.log("Event: ", event);
                    userId = event["pathParameters"]["user_id"];
                    return [4 /*yield*/, SilaWallet.getWallet(userId)];
                case 2:
                    wallet = (_a.sent())[0];
                    if (!wallet) {
                        throw Error("No wallet for user");
                    }
                    response.body = JSON.stringify({ handle: wallet.handle });
                    response.statusCode = 200;
                    return [2 /*return*/, response];
                case 3:
                    err_2 = _a.sent();
                    console.log("Wallet error: ", err_2);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/, response];
            }
        });
    });
}
exports.fetch = fetch;

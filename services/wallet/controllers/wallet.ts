import { HttpResponse } from "../lib/models/httpResponse";
import * as bankController from "../lib/controllers/sila";
import { SilaWallet } from "../lib/models/wallet";
import * as Joi from "joi";
import { parseAndValidate } from "../lib/handlers/bodyParser";
import { User } from "../lib/models/user";
import * as SNS from "../lib/handlers/sns";

// POST Body format validator
const schema = Joi.object().keys({
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
async function create({
  body: bodyUnvalidated,
  requestContext: {
    authorizer: { principalId: userId }
  }
}) {
  try {
    // Parse and validate payload
    const body = parseAndValidate(bodyUnvalidated, schema);

    // Fetch the user from the database
    const user: any = await User.query().findById(userId);
    console.log(user);

    // Fetch the user's wallet info from the database
    // and make sure that one does not
    // Already exist
    const wallet = await SilaWallet.getActiveWallets(userId);
    console.log("Active Wallets: ", wallet);
    if (wallet.length > 0) {
      throw Error("User already has an active wallet");
    }

    // Register with our banking provider
    // Abstracted away banking provider into
    // bankController
    await bankController.register(userId, {
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
    });

    // Post to an SNS topic that a wallet has been created
    const res = await SNS.publish(
      "user-wallet-registered",
      JSON.stringify({
        user_id: userId,
        wallet: "sila"
      })
    );
    console.log("SNS Result: ", res);

    // Remove the user from the serial list
    return new HttpResponse(200, "success");
  } catch (err) {
    console.log("Error: ", err);
    return new HttpResponse(200, err.message);
  }
}

/**
 * Fetch and return
 *     "handle",
 *     "account_type",
 *     "active_balance",
 *     "pending_balance",
 *     "kyc_state",
 *     "bank_linked"
 *
 * @param {*} { pathParameters: { user_id: userId } }
 * @returns
 */
async function fetch({ pathParameters: { user_id: userId } }) {
  try {
    // Check to make sure that a SILA account has been linked already
    const wallet: any = await SilaWallet.getWallet(userId, [
      "handle",
      "account_type",
      "active_balance",
      "pending_balance",
      "kyc_state",
      "bank_linked"
    ]);
    if (!wallet) {
      throw Error("No wallet for user");
    }

    return new HttpResponse(200, "success", wallet);
  } catch (err) {
    console.log("Wallet error: ", err);
    return new HttpResponse(404, err.message);
  }
}

export { create, fetch };

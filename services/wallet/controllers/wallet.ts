const Joi = require("joi");
const { parseAndValidate } = require("../lib/handlers/bodyParser");
const { User } = require("../lib/models/user");
const { SilaWallet } = require("../lib/models/wallet");
const bankController = require("../lib/controllers/sila");
const SNS = require("../lib/handlers/sns");

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
async function create(event) {
  const response = { statusCode: 400, body: "" };
  try {
    console.log("Event: ", event);

    // Parse and validate payload
    const body = parseAndValidate(event.body, schema);

    // Fetch user_id
    const userId = event["pathParameters"]["user_id"];

    // Fetch the user from the database
    const user = await User.query().findById(userId);
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
      ssn: String(body.ssn),
      public_token: body.public_token
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

    // Build response
    response.statusCode = 200;
    response.body = JSON.stringify({ message: "Successfully Registered" });
  } catch (err) {
    console.log("Error: ", err);
    response.body = JSON.stringify({ message: err.message });
  }
  return response;
}

async function fetch(event) {
  const response = { statusCode: 400, body: "" };
  try {
    console.log("Event: ", event);

    // Fetch user_id
    const userId = event["pathParameters"]["user_id"];

    // Check to make sure that a SILA account has been linked already
    const [wallet] = await SilaWallet.getWallet(userId);
    if (!wallet) {
      throw Error("No wallet for user");
    }
    response.body = JSON.stringify({ handle: wallet.handle });
    response.statusCode = 200;
    return response;
  } catch (err) {
    console.log("Wallet error: ", err);
  }
  return response;
}

export { create, fetch };
const Joi = require("joi");
const UserModel = require("../lib/models/user");
const { parseAndValidate } = require("../lib/handlers/bodyParser");
const SNS = require("../lib/handlers/sns");
const SMS = require("../lib/handlers/sms");

const User = UserModel.User;

/*
 * Register
 */
// Register Body Format Validator
const schema = Joi.object().keys({
  first_name: Joi.string().required(),
  last_name: Joi.string().required(),
  email: Joi.string().required(),
  password: Joi.string().required()
});

async function register(event) {
  let response = { statusCode: 400, body: null };
  console.log("Event: ", event);
  try {
    // Parse and validate payload
    const body = parseAndValidate(event.body, schema);
    console.log(body);

    // Insert the user into the database
    const user = await User.query().insert({
      first_name: body.first_name,
      last_name: body.last_name,
      email: body.email,
      password: body.password
    });

    const res = await SNS.publish(
      "user-registered",
      JSON.stringify({
        user_id: user.id
      })
    );
    console.log(res);

    // Build reply
    response = {
      statusCode: 200,
      body: JSON.stringify({
        message: "success",
        user_id: user.id
      })
    };
    console.log("test: ", user);
  } catch (err) {
    console.log("Error: ", err);
    response.body = JSON.stringify({ message: "Failed to register" });
  }
  return response;
}

/*
 *  GET a user
 */
async function fetch(event) {
  console.log(event);
  let response = { statusCode: 500, body: null };
  try {
    const userId = event["pathParameters"]["user_id"];
    console.log("userId: ", userId);
    const user = await User.query().findById(userId);
    // Don't return the password
    user.password = null;

    console.log(user);
    response = {
      statusCode: 200,
      body: JSON.stringify({
        result: user
      })
    };
  } catch (err) {
    console.log(err);
  }
  return response;
}

/*
 *  PUT/UPDATE a user
 */
// Register Body Format Validator
const updateSchema = Joi.object().keys({
  phone: Joi.string()
});
async function update(event) {
  const response = { statusCode: 400, body: null };
  console.log("Event: ", event);
  try {
    // Parse and validate payload
    const body = parseAndValidate(event.body, updateSchema);
    console.log(body);

    const userId = event["pathParameters"]["user_id"];
    console.log("userId: ", userId);

    const phone = body.phone;
    if (phone) {
      await updatePhone(userId, phone);
      response.statusCode = 200;
    }
  } catch (err) {
    console.log("Error: ", err);
  }
  return response;
}

async function updatePhone(userId, phone) {
  // Generate save, and send a validation code to the user
  const OTC = generateOTC();

  // Update the user's phone number and OTC in the database
  await UserModel.updatePhone(userId, phone, OTC);

  // Send SMS
  console.log(`User(${userId}) sending OTC(${OTC})`);
  const smsRes = await SMS.sendMessage(SMS.verificationSms(OTC), phone);
  console.log("SMS Result: ", smsRes);
}

/*
 *  Validate a user
 */
// Register Body Format Validator
const validateSchema = Joi.object().keys({
  phone_otc: Joi.string()
});
async function validate(event) {
  const response = { statusCode: 400, body: null };
  console.log("Event: ", event);
  try {
    // Parse and validate payload
    const body = parseAndValidate(event.body, validateSchema);
    console.log(body);

    const userId = event["pathParameters"]["user_id"];
    console.log("userId: ", userId);

    const phoneOTC = body.phone_otc;
    if (phoneOTC) {
      await validatePhone(userId, phoneOTC);
      response.statusCode = 200;
    }
  } catch (err) {
    console.log("Error: ", err);
  }
  return response;
}

async function validatePhone(userId, OTC) {
  // Check if the OTC matches
  const user = await UserModel.getPhoneValidation(userId);
  const otcTimeStamp = user.phone_otc_ts.getTime() / 1000;
  const timeDiffMin = (unixTime() - otcTimeStamp) / 60;
  console.log(
    `unixTime(${unixTime()} - otcTimeStamp(${otcTimeStamp}) = ${timeDiffMin})`
  );
  if (user.phone_otc != OTC) {
    throw Error("Incorrect OTC");
  } else if (timeDiffMin > 5) {
    throw Error(`Too much time(${timeDiffMin}) has elapsed for OTC`);
  }
  await User.query()
    .findById(userId)
    .update({ phone_validated: true });
}

function unixTime() {
  return Math.floor((new Date() as any) / 1000);
}

function generateOTC() {
  const OTCLen = 4;
  const digits = "0123456789";
  let OTC = "";
  for (let i = 0; i < OTCLen; i++) {
    OTC += digits.charAt(Math.floor(Math.random() * digits.length));
  }
  return OTC;
}

export { generateOTC, register, fetch, update, validate };

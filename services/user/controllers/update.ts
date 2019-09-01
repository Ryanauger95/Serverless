import * as Joi from "joi";
import { User } from "../lib/models/user";
import { parseAndValidate } from "../lib/handlers/bodyParser";
import { HttpResponse } from "../lib/models/httpResponse";
import * as SMS from "../lib/handlers/sms";
import { uploadProfilePic } from "../lib/handlers/s3";

/**
 * PUT/UPDATE a user
 *
 * @param {*} {
 *   pathParameters: { user_id: userIdStr },
 *   body: bodyUnvalidated,
 *   requestContext: {
 *     authorizer: { principalId: principalId }
 *   }
 * }
 * @returns
 */
async function update({
  body: bodyUnvalidated,
  requestContext: {
    authorizer: { principalId: principalId }
  }
}) {
  try {
    // Make sure the inputs match what we expect
    // Parse and validate payload
    const updateSchema = Joi.object().keys({
      phone: Joi.string().optional(),
      phone_otc: Joi.string().optional()
    });
    const { phone: phone, phone_otc: phoneOTC } = parseAndValidate(
      bodyUnvalidated,
      updateSchema
    );

    if (phone) {
      await handlePhoneUpdate(principalId, phone);
    } else if (phoneOTC) {
      await handlePhoneVerify(principalId, phoneOTC);
    } else {
      throw Error("Bad payload");
    }
    return new HttpResponse(200);
  } catch (err) {
    console.log("Error: ", err);
    return new HttpResponse(400, err.message);
  }
}

async function handlePhoneUpdate(userId, phone) {
  // Generate save, and send a validation code to the user
  const OTC = generateOTC();

  // Update the user's phone number and OTC in the database
  await User.updatePhone(userId, phone, OTC);

  // Send SMS
  console.log(`User(${userId}) sending OTC(${OTC})`);
  await SMS.sendMessage(SMS.verificationSms(OTC), phone);
}

async function handlePhoneVerify(userId, OTC) {
  // Check if the OTC matches
  const user: any = await User.getPhoneValidation(userId);
  const timeDiffMin = getTimeDiffMin(user.phone_otc_ts);
  console.log(
    "timeDiffMin: ",
    timeDiffMin,
    "expected OTC: ",
    user.phone_otc,
    " OTC: ",
    OTC
  );

  if (user.phone_otc != OTC) {
    throw Error("Incorrect OTC");
  } else if (timeDiffMin > 5) {
    throw Error(`Too much time(${timeDiffMin}) has elapsed for OTC`);
  }
  const res = await User.query()
    .findById(userId)
    .update({ phone_validated: true } as any);

  if (res !== 1) {
    throw Error("Error updating phone_validated!");
  }
}

function getTimeDiffMin(date: Date): number {
  const diffMs = new Date().getTime() - date.getTime();
  return Math.round(((diffMs % 86400000) % 3600000) / 60000); // minutes
}

/**
 * Generates a 4 digit-character OTC
 *
 * @returns {string}
 */
function generateOTC(): string {
  const OTCLen = 4;
  const digits = "0123456789";
  let OTC = "";
  for (let i = 0; i < OTCLen; i++) {
    OTC += digits.charAt(Math.floor(Math.random() * digits.length));
  }
  return OTC;
}

/**
 * Updates the profile picture for the user who is posting
 * -uploads the profile picture to s3, saves the url in MySQL,
 * and returns the url
 *
 * @param {*} {
 *   body: bodyUnvalidated,
 *   requestContext: {
 *     authorizer: { principalId: principalId }
 *   }
 * }
 */
async function profileImg({
  body: bodyUnvalidated,
  requestContext: {
    authorizer: { principalId: principalId }
  }
}) {
  try {
    // Make sure the inputs match what we expect
    // Parse and validate payload
    const schema = Joi.object().keys({
      profile_img: Joi.string().optional()
    });
    const { profile_img: profileImg } = parseAndValidate(
      bodyUnvalidated,
      schema
    );

    // Uploads to S3
    const s3Url = await uploadProfilePic(principalId, profileImg);

    // Save URL
    await User.updateProfilePicUrl(principalId, s3Url);

    // Return to user
    return new HttpResponse(200, "success!", { profile_img_url: s3Url });
  } catch (err) {
    console.log("Profile upload Err: ", err);
  }
}

export { update, profileImg };

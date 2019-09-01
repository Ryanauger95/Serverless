import * as envvar from "envvar";
/**
 * Twilio Actions
 */

const accountSid = envvar.string("TWILIO_SID");
const authToken = envvar.string("TWILIO_TOKEN");
const fromPhone = envvar.string("TWILIO_FROM");
const client = require("twilio")(accountSid, authToken);

/*
 * Send text message
 */
function sendMessage(message, receiver) {
  console.log("SID: ", accountSid);
  console.log("TOKEN: ", authToken);
  console.log("FROM: ", fromPhone);
  return client.messages.create({
    from: fromPhone,
    body: message,
    to: receiver
  });
}

/*
 *    Verification Sms Templates
 */
function verificationSms(pin) {
  return `Use Pin: ${pin} to verify Pay-Lance Account.`;
}

/*
 *    Forgot password pin Sms Templates
 */
function forgotPwdSms(pin) {
  return `Use Pin: ${pin} to Confirm the Pay-Lance App password reset request. \
  This pin is valid for only 5 minutes.\
  If you didn't request this, Please contact the Pay-Lance Customer Support`;
}

export { sendMessage, verificationSms, forgotPwdSms };

/**
 * Twilio Actions
 */

const accountSid = process.env.TWILIO_SID;
const authToken = process.env.TWILIO_TOKEN;
const fromPhone = process.env.TWILIO_FROM;
const client = require('twilio')(accountSid, authToken);

/*
 * Send text message
 */
function sendMessage(message, receiver) {
  return client.messages
      .create({from: fromPhone, body: message, to: receiver})
      .done();
};

/*
 *    Verification Sms Templates
 */
function verificationSms(pin) {
  return `Use Pin: ${pin} to verify Esgro Account.`;
};

/*
 *    Forgot password pin Sms Templates
 */
function forgotPwdSms(pin) {
  return `Use Pin: ${pin} to Confirm the Esgro App password reset request. \
  This pin is valid for only 5 minutes.\
  If you didn't request this, Please contact the Esgro Customer Support`;
};

module.exports = {
  sendMessage,
  verificationSms,
  forgotPwdSms,
};

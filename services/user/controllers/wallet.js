const Joi = require('joi');
const {parseAndValidate}= require('../lib/handlers/bodyParser');
const {User} = require('../lib/models/userModel');
const bankProxy = require('../lib/handlers/bankProxy');

// POST Body format validator
const schema = Joi.object().keys({
  address_1: Joi.string().required(),
  address_2: Joi.string().required(),
  city: Joi.string().required(),
  state: Joi.string().required(),
  zip: Joi.number().required(),
  ssn: Joi.number().integer().required(),
});

// Accepts the KYC information from the user.
// If the user exists, and does not have any active account,
// then we use the bank shem
async function create(event) {
  const response = {};
  try {
    console.log('Event: ', event);

    // Parse and validate payload
    const body = parseAndValidate(event.body, schema);

    // Fetch user_id
    const userId = event['pathParameters']['user_id'];

    // Fetch the user from the database
    const user = await User.query().findById(userId);
    console.log(user);

    // Call bank proxy
    const bankReg = bankProxy.register({
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      phone: user.phone,
      address: body.address_1,
      address_2: body.address_2,
      city: body.city,
      state: body.state,
      zip: body.zip,
      ssn: body.ssn,
    });
    console.log(bankReg);
  } catch (err) {
    console.log('Error: ', err);
  }
  return response;
}

module.exports = {
  create: create,
};

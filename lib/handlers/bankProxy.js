const request = require('request-promise')
const { parseAndValidate } = require('./bodyParser');
const Joi = require('joi');

const BANK_PROXY_HOSTNAME = process.env.BANK_PROXY_HOSTNAME
const PORT = 443

// POST Body format validator
const schema = Joi.object().keys({
  first_name: Joi.string().required(),
  last_name: Joi.string().required(),
  email: Joi.string().required(),
  phone: Joi.string().required(),
  address_1: Joi.string().required(),
  address_2: Joi.string().required(),
  city: Joi.string().required(),
  state: Joi.string().required(),
  zip: Joi.number().required(),
  ssn: Joi.number().integer().required(),
});

// Register
async function register(data) {

  // Parse and validate payload
  const body = parseAndValidate(data, schema);

  // Build request
  const options = {
    uri: BANK_PROXY_HOSTNAME + '/register',
    method: 'POST',
    body: body,
    json: true
  }
  try {
    const rsp = await request(options)
    console.log("Req: ", rsp)
    return true
  } catch (err) {
    console.log("Error: ", err)
    return false
  }

}

module.exports = {
  register: register
}
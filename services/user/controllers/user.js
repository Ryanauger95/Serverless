const Joi = require('Joi');
const {User} = require('../../../lib/models/userModel');
const {parseAndValidate}= require('../../../lib/handlers/bodyParser');

// POST Body format validator
const schema = Joi.object().keys({
  first_name: Joi.string().required(),
  last_name: Joi.string().required(),
  email: Joi.email().required(),
  password: Joi.string().required(),
});

async function register(event) {
  const response = {};
  try {
    console.log('Event: ', event);

    // Parse and validate payload
    const body = parseAndValidate(event.body, schema);

    // Insert the user into the database
    const test = User.query().insert({
      first_name: body.first_name,
      last_name: body.last_name,
      email: body.email,
      password: body.password,
    });
    console.log('test: ', test);
  } catch (err) {
    console.log(err);
  }
  return response;
}

module.exports = {
  register: register,
};

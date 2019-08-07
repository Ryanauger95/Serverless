const Joi = require('joi');
const {User} = require('../lib/models/userModel');
const {parseAndValidate}= require('../lib/handlers/bodyParser');
const SNS = require('../lib/handlers/sns')


/*
 * Register
 */
// Register Body Format Validator
const schema = Joi.object().keys({
  first_name: Joi.string().required(),
  last_name: Joi.string().required(),
  email: Joi.string().required(),
  password: Joi.string().required(),
});

async function register(event) {
  let response = {statusCode: 400};
  console.log('Event: ', event);
  try {
    // Parse and validate payload
    const body = parseAndValidate(event.body, schema);
    console.log(body)

    // Insert the user into the database
    const user = await User.query().insert({
      first_name: body.first_name,
      last_name: body.last_name,
      email: body.email,
      password: body.password,
    });

    const res = await SNS.publish('user-registered', JSON.stringify({
      'user_id': user.id,
    }));
    console.log(res);


    // Build reply
    response = {
      statusCode: 200,
      body: JSON.stringify({
        message: 'success',
        user_id: user.id,
      }),
    };
    console.log('test: ', user);
  } catch (err) {
    console.log('Error: ', err);
    response.body = JSON.stringify({message: 'Failed to register'});
  }
  return response;
}


/*
*  GET a user
*/
async function fetch(event) {
  console.log(event);
  let response = {statusCode: 500};
  try {
    const userId = event['pathParameters']['user_id'];
    console.log('userId: ', userId);
    const user = await User.query().findById(userId);
    // Don't return the password
    user.password = null;

    console.log(user);
    response = {
      statusCode: 200,
      body: JSON.stringify({
        result: user,
      }),
    };
  } catch (err) {
    console.log(err);
  }
  return response;
}

module.exports = {
  register: register,
  fetch: fetch,
};


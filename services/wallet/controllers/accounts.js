const Joi = require('joi');
const {SilaWallet} = require('../lib/models/walletModel');
const bankController = require('../../../lib/controllers/sila');
const {parseAndValidate}= require('../lib/handlers/bodyParser');


// POST Body format validator
const schema = Joi.object().keys({
  public_token: Joi.string().required(),
});

async function link(event) {
  const response = {statusCode: 400};
  try {
    console.log('Event: ', event);

    // Parse and validate payload
    const body = parseAndValidate(event.body, schema);

    // Fetch user_id
    const userId = event['pathParameters']['user_id'];

    // Check to make sure that a SILA account has been linked already
    const [wallet] = await SilaWallet
        .query()
        .select('*')
        .where({active: 1, app_users_id: userId});

    // Attempt to link the account w/ SILA
    const publicToken = body.public_token;
    const handle = wallet.handle;
    const key = wallet.private_key;
    const linkAccount = await bankController.linkAccount(handle, key, publicToken);
    if (!linkAccount || linkAccount.status != 'SUCCESS') {
      throw Error('Failed to link account');
    }
    response = {statusCode: 200};
  } catch (err) {
    console.log('Account link error: ', err);
  }
  return response;
}

async function get(event) {
  const response = {statusCode: 400};
  try {
    console.log('Event: ', event);

    // Fetch user_id
    const userId = event['pathParameters']['user_id'];

    // Check to make sure that a SILA account has been linked already
    const [wallet] = await SilaWallet
        .query()
        .select('*')
        .where({active: 1, app_users_id: userId});

    // Get accounts
    // Attempt to link the account w/ SILA
    const handle = wallet.handle;
    const privateKey = wallet.private_key;
    const silaAccounts = await bankController.getAccounts(handle, privateKey);
    if (!silaAccounts) {
      throw new Error('Failed to get accounts');
    }
    console.log('silaAccounts: ', silaAccounts);
    response.statusCode = 200;
    response.body = JSON.stringify({accounts: silaAccounts});
  } catch (err) {
    console.log('Account retreive Error: ', err);
  }
  return response;
}

module.exports = {
  link,
  get,
};

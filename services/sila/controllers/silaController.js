const sila = require('../handlers/silaHandler');
const userModel = require('../../../lib/models/userModel');
const SILAModel = require('../models/silaModel');
const {CodeError, handleError} = require('../../../lib/handlers/error');

// POST Body format validator
const schema = Joi.object().keys({
  address_1: Joi.string().required(),
  address_2: Joi.string().required(),
  city: Joi.string().required(),
  state: Joi.string().required(),
  zip: Joi.string().required(),
  ssn: Joi.number().integer().required(),
});

const registerUser = async (req, res) => {
  try {
    // 6. Save the user to the database
    const silaModel = new SILAModel(
        {
          'user_id': kycInfo.user_id,
          'handle': kycInfo.handle,
          'address': wallet.address,
          'privKey': wallet.privateKey,
        }
    );
    const silaSave = await silaModel.save();
    console.log(silaSave);

    // 7. Request KYC
    //   - Can we make this an event listener on the MYSQL DB?
    //   - Or set a flag in the db and have a microservice processing it?
    const startKYC = await sila.requestKYC(kycInfo, wallet.privateKey);
    console.log('startKYC: ', startKYC);
    if (!startKYC || startKYC.status != 'SUCCESS') {
      throw new CodeError('Start KYC failed for some reason...');
    }

    {res.status(200).send({message: 'successfully registered!'});}
  } catch (err) {
    handleError(req, res, err);
  }
};

// Get wallet will just return a status code and basic message stating
// whether or not the user has
// an account on file
async function getWallet(req, res) {
  const silaCheck = new SILAModel({'user_id': req.params.userId});
  try {
    const active = await silaCheck.getActive();
    console.log('active:', active);
    if ( active.length != 0) {
      res.status(200).send({message: 'Account exists'});
    } else {
      res.status(400).send({message: 'Bank accountoo does not exist'});
    }
  } catch (err) {
    handleError(req, res, err);
  }
}


// Receives a plaid public token from the user
// and links that to the user's account
async function linkAccount(req, res) {
  try {
    // Check to make sure that a SILA account has been linked already
    const silaAcct = new SILAModel({user_id: req.params.userId});
    const active = await silaAcct.getActive();
    if ( active.length == 0) {
      throw new CodeError('No Account to Link to', 400);
    }

    // Attempt to link the account w/ SILA
    const account = active[0];
    const publicToken = req.body.public_token;
    const handle = account.sila_username;
    const key = account.key_value;
    const linkAccount = await sila.linkAccount(handle, key, publicToken);
    if (!linkAccount || linkAccount.status != 'SUCCESS') {
      throw new CodeError('Failed to link account', 400);
    }

    res.send({message: 'Linked account!'});
  } catch (err) {
    handleError(req, res, err);
  }
}

// Get the accounts from sila
async function getAccounts(req, res) {
  try {
    // Check to make sure that a SILA account has been linked already
    const silaAcct = new SILAModel({user_id: req.params.userId});
    const active = await silaAcct.getActive();
    if ( active.length == 0) {
      throw new CodeError('No account to get accounts for', 400);
    }

    // Get accounts
    // Attempt to link the account w/ SILA
    const account = active[0];
    const handle = account.sila_username;
    const key = account.key_value;
    const silaAccounts = await sila.getAccounts(handle, key);
    if (!silaAccounts || silaAccounts.length <= 0) {
      console.log(silaAccounts);
      throw new CodeError('Failed to get accounts', 400);
    }
    console.log('silaAccounts: ', silaAccounts);
    res.send({message: 'Accounts retreived', accounts: silaAccounts});
  } catch (err) {
    handleError(req, res, err);
  }
}


module.exports.registerUser = registerUser;
module.exports.getWallet = getWallet;
module.exports.linkAccount = linkAccount;
module.exports.getAccounts = getAccounts;

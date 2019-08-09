const sila = require('../handler/silaHandler');
const {SilaWallet} = require('../lib/models/walletModel');


async function register(id, info) {
  // Generate handle
  const wallet = sila.generateWallet();
  const idAppend = wallet.address.substr(-6);
  const handleUnfiltered = info.first_name +
      '.' + info.last_name +
      '.' + idAppend;
  const handle = handleUnfiltered.replace(/\s/g, ''); // remove whitespace
  console.log('SilaWallet: ', wallet);
  console.log('Handle: ', handle);

  // Register the user w/ Sila
  info.handle = handle;
  info.crypto = wallet.address;
  console.log('Registering with info: ', info);
  const registerRes = await sila.register(info);
  console.log(registerRes);
  if (registerRes.status != 'SUCCESS') {
    throw Error(registerRes.message);
  }

  // Save the wallet to the database
  // TODO: Should we move this functionality into wallet.js...?
  // No. The table is separate, and we will have
  // separate tables for different providers
  await new SilaWallet().insert({
    address: wallet.address,
    handle: handle,
    private_key: wallet.privateKey,
    active: 1,
    kyc_state: 0,
    app_users_id: id,
  }, true);

  return true;
};

// Get wallet will just return a status code and basic message stating
// whether or not the user has
// an account on file
// async function getSilaWallet.g(req, res) {
//   const silaCheck = new SILAModel({'user_id': req.params.userId});
//   try {
//     const active = await silaCheck.getActive();
//     console.log('active:', active);
//     if ( active.length != 0) {
//       res.status(200).send({message: 'Account exists'});
//     } else {
//       res.status(400).send({message: 'Bank accountoo does not exist'});
//     }
//   } catch (err) {
//     handleError(req, res, err);
//   }
// }


// // Receives a plaid public token from the user
// // and links that to the user's account
// async function linkAccount(req, res) {
//   try {
//     // Check to make sure that a SILA account has been linked already
//     const silaAcct = new SILAModel({user_id: req.params.userId});
//     const active = await silaAcct.getActive();
//     if ( active.length == 0) {
//       throw new CodeError('No Account to Link to', 400);
//     }

//     // Attempt to link the account w/ SILA
//     const account = active[0];
//     const publicToken = req.body.public_token;
//     const handle = account.sila_username;
//     const key = account.key_value;
//     const linkAccount = await sila.linkAccount(handle, key, publicToken);
//     if (!linkAccount || linkAccount.status != 'SUCCESS') {
//       throw new CodeError('Failed to link account', 400);
//     }

//     res.send({message: 'Linked account!'});
//   } catch (err) {
//     handleError(req, res, err);
//   }
// }

// // Get the accounts from sila
// async function getAccounts(req, res) {
//   try {
//     // Check to make sure that a SILA account has been linked already
//     const silaAcct = new SILAModel({user_id: req.params.userId});
//     const active = await silaAcct.getActive();
//     if ( active.length == 0) {
//       throw new CodeError('No account to get accounts for', 400);
//     }

//     // Get accounts
//     // Attempt to link the account w/ SILA
//     const account = active[0];
//     const handle = account.sila_username;
//     const key = account.key_value;
//     const silaAccounts = await sila.getAccounts(handle, key);
//     if (!silaAccounts || silaAccounts.length <= 0) {
//       console.log(silaAccounts);
//       throw new CodeError('Failed to get accounts', 400);
//     }
//     console.log('silaAccounts: ', silaAccounts);
//     res.send({message: 'Accounts retreived', accounts: silaAccounts});
//   } catch (err) {
//     handleError(req, res, err);
//   }
// }


module.exports = {
  register: register,
};
// module.exports.registerUser = registerUser;
// module.exports.getSilaWallet.g = getWallet;
// module.exports.linkAccount = linkAccount;
// module.exports.getAccounts = getAccounts;

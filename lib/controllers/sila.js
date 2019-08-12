const sila = require('../handlers/sila');
const {SilaWallet} = require('../../services/wallet/lib/models/walletModel');
const KYC = require('../../services/wallet/controllers/kyc');


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


  // Request KYC
  // TODO:  We could move this functionality elsewhere,
  // Have KYC requesting as a microservice, but then we would
  // be storing SSNs somewhere else ... easiest thing to do now is
  // put it here...? Or throw it on an SNS topic...
  const res = await requestKYC(info, wallet.privateKey);
  console.log('KYC Result: ', res);


  // Save the wallet to the database
  // TODO: Should we move this functionality into wallet.js...?
  // No. The table is separate, and we will have
  // separate tables for different providers
  await new SilaWallet().insert({
    address: wallet.address,
    handle: handle,
    private_key: wallet.privateKey,
    active: 1,
    kyc_state: KYC.KYC_STATE['PENDING'],
    app_users_id: id,
  }, true);
  console.log('Registered Sila Wallet');

  return true;
};


async function requestKYC(kycInfo, privateKey) {
  return sila.requestKYC(kycInfo, privateKey);
}

async function checkKYC(handle, privateKey) {
  return sila.checkKYC(handle, privateKey);
}

function linkAccount(handle, privateKey, publicToken) {
  return sila.linkAccount(handle, privateKey, publicToken);
}

function getAccounts(handle, privateKey) {
  return sila.getAccounts(handle, privateKey);
}

module.exports = {
  register,
  requestKYC,
  checkKYC,
  linkAccount,
  getAccounts,
};
// module.exports.registerUser = registerUser;
// module.exports.getSilaWallet.g = getWallet;
// module.exports.linkAccount = linkAccount;
// module.exports.getAccounts = getAccounts;

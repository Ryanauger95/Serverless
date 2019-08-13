const WalletModel = require('../lib/models/walletModel');
const SilaWallet = WalletModel.SilaWallet;
const {Txn} = require('../lib/models/txn');

async function issueAll() {
  console.log(Txn);
  const res = await Txn.query().findById(22);
  console.log(res);
}

module.exports = {
  issueAll,
}
;

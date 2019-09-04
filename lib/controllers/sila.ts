import { sila, fboHandle } from "../handlers/sila";
import { SilaWallet, KYC_STATE, ACCOUNT_TYPE } from "../models/wallet";

class Wallet {
  address: string;
  handle: string;
  private_key: string;
  active: boolean;
  kyc_state: KYC_STATE;
  account_type: ACCOUNT_TYPE;
  app_users_id: number;
  constructor(
    address: string,
    handle: string,
    private_key: string,
    active: boolean,
    kyc_state: KYC_STATE,
    account_type: ACCOUNT_TYPE,
    app_users_id: number
  ) {
    this.address = address;
    this.handle = handle;
    this.private_key = private_key;
    this.active = active;
    this.kyc_state = kyc_state;
    this.account_type = account_type;
    this.app_users_id = app_users_id;
  }
}
async function register(id, info): Promise<Wallet> {
  // Generate handle
  const wallet = sila.generateWallet();
  const idAppend = wallet.address.substr(-6);
  const handleUnfiltered =
    info.first_name + "." + info.last_name + "." + idAppend;
  const handle = handleUnfiltered.replace(/\s/g, ""); // remove whitespace
  console.log("SilaWallet: ", wallet);
  console.log("Handle: ", handle);

  // Register the user w/ Sila
  info.handle = handle;
  info.crypto = wallet.address;
  console.log("Registering with info: ", info);
  const registerRes = await sila.register(info);
  console.log(registerRes);
  if (registerRes.status != "SUCCESS") {
    throw Error(registerRes.message);
  }

  // Save the wallet to the database
  // TODO: Should we move this functionality into wallet.js...?
  // No. The table is separate, and we will have
  // separate tables for different providers
  // await SilaWallet.insert(
  //   {
  //     address: wallet.address,
  //     handle: handle,
  //     private_key: wallet.privateKey,
  //     active: 1,
  //     kyc_state: KYC_STATE.PENDING,
  //     account_type: ACCOUNT_TYPE.USER,
  //     app_users_id: id
  //   },
  //   true
  // );
  // console.log("Registered Sila Wallet");
  const newWallet = new Wallet(
    wallet.address,
    handle,
    wallet.privateKey,
    true,
    KYC_STATE.NOT_STARTED,
    ACCOUNT_TYPE.USER,
    id
  );

  return newWallet;
}

async function requestKYC(kycInfo) {
  const wallet: any = await SilaWallet.query().findOne({
    active: true,
    handle: kycInfo.handle
  });
  return sila.requestKYC(kycInfo, wallet.private_key);
}

async function checkKYC(handle) {
  const wallet: any = await SilaWallet.query().findOne({
    active: true,
    handle: handle
  });
  return sila.checkKYC(handle, wallet.private_key);
}

async function linkAccount(handle, publicToken, accountName?) {
  const wallet: any = await SilaWallet.query().findOne({
    active: true,
    handle: handle
  });
  return sila.linkAccount(handle, wallet.private_key, publicToken, accountName);
}

async function getAccounts(handle) {
  const wallet = (await SilaWallet.query().findOne({
    handle: handle,
    active: true
  })) as any;
  return sila.getAccounts(handle, wallet.private_key);
}

async function getTransactions(handle: string, filters?: object) {
  const wallet = (await SilaWallet.query().findOne({
    handle: handle,
    active: true
  })) as any;
  return sila.getTransactions(handle, wallet.private_key, filters);
}
/////////////////////////////
//       Money moves
/////////////////////////////
async function issue(amount, handle, trx?) {
  const wallet = (await SilaWallet.query(trx)
    .findOne({
      handle: handle,
      active: true
    })
    .select(["sila_wallet.*", "bank_account.name as bank_account_name"])
    .join(
      "bank_account",
      "sila_wallet.handle",
      "bank_account.sila_wallet_handle"
    )
    .where({ "bank_account.is_default": true })) as any;
  console.log("wallet: ", wallet);
  return sila.issueSila(
    amount,
    handle,
    wallet.private_key,
    wallet.bank_account_name
  );
}

async function redeem(amount, handle, trx?) {
  const wallet = (await SilaWallet.query(trx).findOne({
    handle: handle,
    active: true
  })) as any;
  console.log("Redeeming Sila");
  return sila.redeemSila(amount, handle, wallet.private_key);
}

async function transfer(fromHandle, toHandle, amount, trx?) {
  console.log("Fromwallet: ", fromHandle);
  const fromWallet = (await SilaWallet.query(trx)
    .findOne({ handle: fromHandle, active: true })
    .select(["private_key", "active_balance"])) as any;

  console.log("Wallet: ", fromWallet);
  console.log("Towallet: ", toHandle);
  const toWallet = (await SilaWallet.query(trx)
    .findOne({ handle: toHandle, active: true })
    .select("handle")) as any;

  if (fromWallet.active_balance < amount) {
    throw Error("Active balance too low!");
  }
  if (toWallet === undefined) {
    throw Error("toWallet DNE!");
  }
  return sila.transferSila(
    amount,
    fromHandle,
    fromWallet.private_key,
    toHandle
  );
}

export {
  register,
  requestKYC,
  checkKYC,
  linkAccount,
  getAccounts,
  getTransactions,
  issue,
  transfer,
  redeem,
  fboHandle
};

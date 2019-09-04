import * as Bank from "../lib/controllers/sila";
import { SilaWallet, KYC_STATE } from "../lib/models/wallet";
import * as SNS from "../lib/handlers/sns";

async function startAll() {
  const wallets = await SilaWallet.query()
    .select("handle")
    .where({ active: 1, kyc_state: KYC_STATE.NOT_STARTED });

  console.log(`Attempting to start ${wallets.length} KYC's`);
  for (let i = 0; i < wallets.length; i++) {
    const wallet: any = wallets[i];
    const res = await Bank.requestKYC({ handle: wallet.handle });
    // .then(async res => {
    console.log("requestKYC success: ", res);
    await SilaWallet.query()
      .patch({
        kyc_state: KYC_STATE.PENDING,
        kyc_poll_count: 1
      } as any)
      .where({ handle: wallet.handle });
    // })
    // .catch(res => {
    //   console.log("requestKYC failed: ", res);
    // });
  }
}
async function checkAll() {
  try {
    const wallets = await SilaWallet.query()
      .select(["handle", "kyc_state"])
      .where({ active: 1, kyc_state: KYC_STATE.PENDING });

    console.log("Wallets in KYC_PENDING: ", wallets);
    for (let i = 0; i < wallets.length; i++) {
      const wallet: any = wallets[i];
      // Check kyc for each user
      const res = await Bank.checkKYC(wallet.handle);
      // .then(async res => {
      // Decode the response
      const kycState = decodeState(res.status, res.message);
      // Increment the poll count
      SilaWallet.query()
        .increment("kyc_poll_count", 1)
        .where({ handle: wallet.handle })
        .catch(err => {
          console.log(
            "ERROR: Couldn't update the poll count for handle: ",
            wallet.handle
          );
        });

      if (kycState == wallet.kyc_state) {
        console.log(`KYC state unchanged for handle(${wallet.handle})`);
      } else {
        console.log(
          "KYC State changed from ",
          wallet.kyc_state,
          " to ",
          kycState
        );

        await SilaWallet.query()
          .update({ kyc_state: kycState } as any)
          .where({ handle: wallet.handle });

        await SNS.publish(
          SNS.SNS_TOPIC.USER_WALLET_KYC_CHANGED,
          JSON.stringify({
            user_id: wallet.app_users_id,
            handle: wallet.handle,
            old_kyc_state: wallet.kyc_state,
            kyc_state: kycState
          })
        );
      }
      // });
    }
    console.log("Finished KYC check for ", wallets.length, " users");
  } catch (err) {
    console.log("Caught Error: ", err);
  }
}

function decodeState(status, message) {
  let kycState = KYC_STATE["FAILED"];
  console.log("KYC message: ", message);
  if (status == "SUCCESS") {
    kycState = KYC_STATE["COMPLETED"];
    // All cases afterwards presume 'FAILURE' status code
  } else if (message.includes("pending")) {
    kycState = KYC_STATE["PENDING"];
  } else if (message.includes("failed")) {
    kycState = KYC_STATE["FAILED"];
  } else {
    kycState = KYC_STATE["UNKNOWN"];
  }
  return kycState;
}

export { startAll, checkAll };

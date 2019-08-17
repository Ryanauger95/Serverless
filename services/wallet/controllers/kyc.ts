const bankController = require("../lib/controllers/sila");
const { SilaWallet, KYC_STATE } = require("../lib/models/wallet");
const SNS = require("../lib/handlers/sns");

async function checkAll() {
  try {
    const wallets = await SilaWallet.query()
      .select("*")
      .where({ active: 1, kyc_state: KYC_STATE["PENDING"] });

    console.log(wallets);
    const promises: any[] = [];
    const incrementPromises: any[] = [];
    // Run Check KYC asynchronously and put the promises into an array
    for (let i = 0; i < wallets.length; i++) {
      const wallet = wallets[i];
      promises[i] = bankController.checkKYC(wallet.handle, wallet.private_key);

      // Increment the field for the # of times we've polled KYC
      incrementPromises[i] = SilaWallet.query()
        .increment("kyc_poll_count", 1)
        .where({ address: wallet.address });
    }

    // Go through our array of promises and wait for their completion
    // upon completion, update the database and SNS publish
    // if the state has changed
    for (let i = 0; i < wallets.length; i++) {
      const wallet = wallets[i];
      const res = await promises[i];
      await incrementPromises[i];

      // Decode the response
      const kycState = decodeState(res.status, res.message);

      // If the state has changed, write it to the database.
      // and publish to an SNS topic
      if (kycState === KYC_STATE["PENDING"]) {
        bankController
          .requestKYC({ handle: wallet.handle }, wallet.private_key)
          .then(res => {
            console.log("requestKYC success: ", res);
          })
          .catch(res => {
            console.log("requestKYC failed: ", res);
          });
      }
      if (kycState != wallet.kyc_state) {
        console.log(
          "KYC State changed from ",
          wallet.kyc_state,
          " to ",
          kycState
        );

        await SilaWallet.query()
          .update({ kyc_state: kycState })
          .where({ address: wallet.address });

        await SNS.publish(
          "user-wallet-kyc_changed",
          JSON.stringify({
            user_id: wallet.app_users_id,
            address: wallet.address,
            handle: wallet.handle,
            old_kyc_state: wallet.kyc_state,
            kyc_state: kycState
          })
        );
      }
      console.log(
        "Finished KYC(",
        kycState,
        ") Check for user: ",
        wallet.app_users_id
      );
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

export { checkAll };

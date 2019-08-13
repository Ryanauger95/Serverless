import { SilaWallet, KYC_STATE } from "../lib/models/wallet";
import { Txn, FUND_STATE } from "../lib/models/txn";
import { Ledger, LEDGER_STATE, SILA_HANDLE } from "../lib/models/ledger";
import * as bankController from "../lib/controllers/sila.js";

async function issueFunds() {
  try {
    // Select all transactions in which
    // 1) The payer's KYC has completed and
    // 2) The txn is in a NOT_FUNDED state
    const txns = await fetchNotFundedTransactions();
    console.log("Txn Res: ", txns);

    // For each Transaction
    // 1) Check the ledger for amount canceled, pending, and complete
    //  a) if any transfers failed, mark error
    //  b) if we overfunded, throw an error
    //  c) if we are underfunded, fund for the correct amount
    //  d) if we are funded correctly, mark as FUNDED
    for (var i = 0; i < txns.length; i++) {
      const txn: any = txns[i];

      // 1)
      var { totalFailed, totalPending, totalComplete } = await checkLedger(
        txn.id
      );
      console.log(
        `Failed = ${totalFailed}, \t Pending = ${totalPending}, \t Completed = ${totalComplete}`
      );

      // a)
      if (totalFailed > 0) {
        throw Error("Failed!");
      }
      // b)
      else if (totalPending + totalComplete > txn.amount) {
        throw Error("Overfunded!");
      }
      // c)
      else if (totalPending + totalComplete === txn.amount) {
        throw Error("Transaction is funded, should not get here");
      }
      // d)
      else if (totalPending + totalComplete < txn.amount) {
        console.log("Issuing $ into the user's account");
        // Issue sila from the payer into their account
        // 1) Issue sila for user
        const fundAmount: number = txn.amount - totalPending - totalComplete;
        console.log(`Issuing ${fundAmount} into user's wallet`);
        const issueResult = await bankController.issueSila(
          fundAmount,
          txn.payer_handle,
          txn.payer_private_key
        );
        console.log("IssueSila Result ", issueResult);
        if (issueResult.status != "SUCCESS") {
          throw Error("Issue money failed");
        }
        const reference = issueResult.reference;
        console.log("Saving ledger entry into the user's account");

        // 2) Enter the value into the ledger
        await Ledger.query().insert({
          from_handle: SILA_HANDLE,
          to_handle: txn.payer_handle,
          amount: fundAmount,
          state: LEDGER_STATE["PENDING"],
          reference: reference,
          txn_id: txn.id
        } as any);
        // Mark Txn as funded
        await markFunded(txn.id);
      }
    }
  } catch (err) {
    console.log("Error: ", err);
  }
}

// Select all transactions in which
// 1) The payer's KYC has completed and
// 2) The txn is in a NOT_FUNDED state
function fetchNotFundedTransactions() {
  return Txn.query()
    .select([
      "txn.*",
      "payer_wallet.handle as payer_handle",
      "payer_wallet.private_key as payer_private_key"
    ])
    .join(
      "sila_wallet as payer_wallet",
      "txn.payer_id",
      "payer_wallet.app_users_id"
    )
    .where({
      "txn.fund_state": FUND_STATE["NOT_FUNDED"],
      "payer_wallet.active": true,
      "payer_wallet.kyc_state": KYC_STATE["COMPLETED"]
    });
}

// Return the total amount of month transacted in the
// ledger
async function checkLedger(txnId) {
  var totalFailed: number = 0;
  var totalPending: number = 0;
  var totalComplete: number = 0;

  const ledger: any = await Ledger.query()
    .select("*")
    .where({ txn_id: txnId });
  for (var i = 0; i < ledger.length; i++) {
    const ledgerEntry = ledger[i];
    if (ledgerEntry.state === LEDGER_STATE["PENDING"]) {
      totalPending += ledgerEntry.amount;
    } else if (ledgerEntry.state === LEDGER_STATE["COMPLETED"]) {
      totalComplete += ledgerEntry.amount;
    } else if (ledgerEntry.state === LEDGER_STATE["FAILED"]) {
      totalFailed += ledgerEntry.amount;
    }
  }

  return { totalFailed, totalPending, totalComplete };
}

// Mark Txn Funded
function markFunded(txnId) {
  return Txn.query()
    .findById(txnId)
    .patch({ fund_state: FUND_STATE["FUNDED"] } as any);
}

export { issueFunds };

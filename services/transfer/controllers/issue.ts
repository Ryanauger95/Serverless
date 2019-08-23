import { Txn, FUND_STATE, DEAL_STATE } from "../lib/models/txn";
import { totalTxn } from "../lib/controllers/ledger";
import { fetchTransactions } from "./common";
import * as funds from "../lib/controllers/funds";

// For each transaction that is not funded,
// if the payer DOES NOT have enough money,
// then issue funds into their account
async function issueFunds() {
  try {
    const txns = await fetchTransactions(
      FUND_STATE.NOT_FUNDED,
      DEAL_STATE.PROGRESS
    );
    console.log(`#Txns: ${txns.length}`);

    for (var i = 0; i < txns.length; i++) {
      // const txn: any = txns[i];
      const txn: any = txns[i].toJSON();
      const payerEffectiveBalance =
        txn.payer_active_balance + txn.payer_pending_balance;

      // Total the txn's balance information
      const totals = await totalTxn(txn.id);
      console.log("Totals: ", totals);
      const fboEffectiveBalance = totals.fbo.completed + totals.fbo.pending;
      const amountRemaining = txn.total - fboEffectiveBalance;
      const fundsRequired = amountRemaining - payerEffectiveBalance;

      // If the user has enough in their account, we
      // mark the txn as ISSUE_COMPLETE
      if (txn.payer_active_balance >= amountRemaining) {
        console.log(`TXN(${txn.id}) NOT_FUNDED -> ISSUE_COMPLETE`);
        await Txn.updateFundState(txn.id, FUND_STATE.ISSUE_COMPLETE);
      }
      // If the user will have enough in their account,
      // then mark as issue pending
      else if (payerEffectiveBalance >= amountRemaining) {
        console.log(`TXN(${txn.id}) NOT_FUNDED -> ISSUE_PENDING`);
        await Txn.updateFundState(txn.id, FUND_STATE.ISSUE_PENDING);
      } else if (fundsRequired > 0) {
        //
        console.log(`TXN(${txn.id}) issuing ${fundsRequired}`);
        await funds.issue(
          txn.payer_handle,
          fundsRequired,
          txn.id,
          FUND_STATE.ISSUE_PENDING
        );
      }
    }
  } catch (err) {
    console.log("Error: ", err);
  }
}
// For each transaction that is ISSUE_PENDING,
// check the user balance and if the active balance
// is sufficient, move to ISSUE_COMPLETE
async function checkIssued() {
  try {
    const txns = await fetchTransactions(
      FUND_STATE.ISSUE_PENDING,
      DEAL_STATE.PROGRESS
    );

    for (var i = 0; i < txns.length; i++) {
      const txn: any = txns[i].toJSON();
      const payerEffectiveBalance =
        txn.payer_active_balance + txn.payer_pending_balance;
      console.log(
        `Payer effective balance: ${payerEffectiveBalance} Total: ${txn.total}`
      );

      // If the user has enough in their account, we
      // mark the txn as ISSUE_COMPLETE
      if (txn.payer_active_balance >= txn.total) {
        console.log(`TXN(${txn.id}) ISSUE_PENDING -> ISSUE_COMPLETE`);
        await Txn.updateFundState(txn.id, FUND_STATE.ISSUE_COMPLETE);
      }
      // If the user will have enough in their account,
      // then mark as issue pending
      else if (payerEffectiveBalance >= txn.total) {
        console.log(`TXN(${txn.id}) ISSUE_PENDING UNCHANGED`);
      }
      // Mark the txn as NOT_FUNDED
      else {
        console.log(`TXN(${txn.id}) ISSUE_PENDING -> NOT_FUNDED`);
        await Txn.updateFundState(txn.id, FUND_STATE.NOT_FUNDED);
      }
    }
  } catch (err) {
    console.log("Error: ", err);
  }
}

export { issueFunds, checkIssued };

import { Txn, FUND_STATE, DEAL_STATE } from "../lib/models/txn";
import { LEDGER_TYPE } from "../lib/models/ledger";
import * as bankController from "../lib/controllers/sila";
import { totalTxn } from "../lib/controllers/ledger";
import { fetchTransactions } from "./common";
import * as funds from "../lib/controllers/funds";

async function fundFbo() {
  // Fetch all Txn's that are ready for FBO transfers
  const txns = await fetchTransactions(
    FUND_STATE.ISSUE_COMPLETE,
    DEAL_STATE.PROGRESS
  );
  console.log(`#Txns: ${txns.length}`);
  for (var i = 0; i < txns.length; i++) {
    const txn: any = txns[i].toJSON();
    console.log("Txn: ", txn);

    // Total the txn's balance information
    const totals = await totalTxn(txn.id);
    console.log("Totals: ", totals);
    const fboActiveBalance = totals.fbo.completed;
    const fboPendingBalance = totals.fbo.pending;
    const fboEffectiveBalance = fboActiveBalance + fboPendingBalance;
    const amountRemaining = txn.total - fboEffectiveBalance;

    // Total the payer's balance information
    const payerActiveBalance = txn.payer_active_balance;

    // Find how much the txn needs
    console.log(`TXN(${txn.id}) FBO requires $${amountRemaining}`);

    // Already funded -- recover from error
    if (amountRemaining === 0) {
      console.log(`TXN(${txn.id}) already funded!`);
      await Txn.updateFundState(txn.id, FUND_STATE.TO_FBO_TRANSFER_COMPLETE);
    }
    // OVerfunded -- Throw major error
    else if (amountRemaining < 0) {
      // Do something
      throw Error("Overfunded!");
    }
    // User Acct Balance not enough -- Not Funded
    else if (amountRemaining > payerActiveBalance) {
      console.log(`TXN(${txn.id}) ISSUE_COMPLETE -> NOT_FUNDED`);
      await Txn.updateFundState(txn.id, FUND_STATE.NOT_FUNDED);
    } else {
      // Transfer $
      // Fund the amount remaining
      const fboHandle = bankController.fboHandle;
      await funds.transfer(
        txn.payer_handle,
        fboHandle,
        amountRemaining,
        LEDGER_TYPE.TRANSFER_FROM_PAYER_TO_FBO,
        txn.id,
        FUND_STATE.TO_FBO_TRANSFER_PENDING
      );
    }
  }
}

async function checkFundFbo() {
  // Fetch all Txn's that are ready for FBO transfers
  const txns = await fetchTransactions(
    FUND_STATE.TO_FBO_TRANSFER_PENDING,
    DEAL_STATE.PROGRESS
  );
  console.log(`#Txns: ${txns.length}`);
  for (var i = 0; i < txns.length; i++) {
    const txn: any = txns[i].toJSON();
    console.log("Txn: ", txn);

    // Total the txn's balance information
    const totals = await totalTxn(txn.id);
    console.log("Totals: ", totals);
    const fboActiveBalance = totals.fbo.completed;
    const fboPendingBalance = totals.fbo.pending;
    const fboEffectiveBalance = fboActiveBalance + fboPendingBalance;
    const amountRemaining = txn.total - fboEffectiveBalance;

    // Total the payer's balance information
    const payerActiveBalance = txn.payer_active_balance;

    if (fboActiveBalance >= txn.total) {
      console.log(
        `TXN(${txn.id}) TO_FBO_TRANSFER_PENDING -> TO_FBO_TRANSFER_COMPLETE`
      );
      await Txn.updateFundState(txn.id, FUND_STATE.TO_FBO_TRANSFER_COMPLETE);
    } else if (fboEffectiveBalance >= txn.total) {
      console.log(`TXN(${txn.id}) TO_FBO_TRANSFER_PENDING UNCHANGED`);
    } else {
      console.log(`TXN(${txn.id}) TO_FBO_TRANSFER_PENDING -> ISSUE_COMPLETE`);
      await Txn.updateFundState(txn.id, FUND_STATE.ISSUE_COMPLETE);
    }
  }
}

export { fundFbo, checkFundFbo };

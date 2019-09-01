import { TxnController, FUND_STATE, DEAL_STATE } from "../lib/controllers/txn";
import { LEDGER_TYPE } from "../lib/models/ledger";
import * as bankController from "../lib/controllers/sila";
import { totalTxn } from "../lib/controllers/ledger";
import { fetchTransactions, fetchTransactionWalletInfo } from "./common";
import * as funds from "../lib/controllers/funds";

async function fundFbo() {
  // Fetch all Txn's that are ready for FBO transfers
  const txns = await fetchTransactions(
    FUND_STATE.ISSUE_PENDING,
    DEAL_STATE.PROGRESS
  );
  console.log(`#Txns: ${txns.length}`);
  for (var i = 0; i < txns.length; i++) {
    const txnUnupdated: any = txns[i].toJSON();
    const txn: any = (await fetchTransactionWalletInfo(
      txnUnupdated.id
    )).toJSON();

    console.log("Txn: ", txn);

    // Total the txn's balance information
    const totals = await totalTxn(txn.id);
    console.log("Totals: ", totals);
    const fboActiveBalance = totals.fbo.completed;
    const fboPendingBalance = totals.fbo.pending;
    const fboEffectiveBalance = fboActiveBalance + fboPendingBalance;
    const amountRemaining = txn.payerTotal - fboEffectiveBalance;

    // Total the payer's balance information
    const payerActiveBalance = txn.payer_active_balance;
    const payerEffectiveBalance =
      txn.payer_active_balance + txn.payer_pending_balance;

    // Find how much the txn needs
    console.log(
      `TXN(${
        txn.id
      }) FBO requires $${amountRemaining}, payerActiveBalance: ${payerActiveBalance}`
    );

    if (amountRemaining === 0) {
      // Already funded -- recover from error
      console.log(`TXN(${txn.id}) already funded!`);
      await TxnController.updateFundState(
        txn.id,
        FUND_STATE.TO_FBO_TRANSFER_COMPLETE
      );
    } else if (
      payerActiveBalance >= amountRemaining &&
      payerEffectiveBalance >= amountRemaining
    ) {
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
    } else if (payerEffectiveBalance >= amountRemaining) {
      //Waiting for pending transfers to come through
      console.log(`TXN(${txn.id}) waiting on funding`);
    } else {
      // Throw major error. Either overfunded or underfunded
      console.log(`TXN(${txn.id}) MAJOR funding error`);
      await TxnController.updateFundState(txn.id, FUND_STATE.NOT_FUNDED);
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

    if (fboActiveBalance >= txn.payerTotal) {
      console.log(
        `TXN(${txn.id}) TO_FBO_TRANSFER_PENDING -> TO_FBO_TRANSFER_COMPLETE`
      );
      await TxnController.updateFundState(
        txn.id,
        FUND_STATE.TO_FBO_TRANSFER_COMPLETE
      );
    } else if (fboEffectiveBalance >= txn.payerTotal) {
      console.log(`TXN(${txn.id}) TO_FBO_TRANSFER_PENDING UNCHANGED`);
    } else {
      console.log(`TXN(${txn.id}) TO_FBO_TRANSFER_PENDING -> NOT_FUNDED`);
      await TxnController.updateFundState(txn.id, FUND_STATE.NOT_FUNDED);
    }
  }
}

export { fundFbo, checkFundFbo };

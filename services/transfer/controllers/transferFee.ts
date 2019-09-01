import { fetchTransactions } from "./common";
import { totalTxn } from "../lib/controllers/ledger";
import { FUND_STATE, DEAL_STATE, TxnController } from "../lib/controllers/txn";
import { LEDGER_TYPE } from "../lib/models/ledger";
import * as funds from "../lib/controllers/funds";

/**
 * Fund the fee collector account
 *
 */
async function fundFee() {
  const txns = await fetchTransactions(
    FUND_STATE.TO_FBO_TRANSFER_COMPLETE,
    DEAL_STATE.PROGRESS
  );
  console.log("#txns: ", txns.length);

  for (var i = 0; i < txns.length; i++) {
    const txn: any = txns[i].toJSON();
    console.log("TxnController: ", txn);

    // Total the txn's balance information
    const totals = await totalTxn(txn.id);
    console.log("Totals: ", totals);
    const fboActiveBalance = totals.fbo.completed;
    const fundingRemaining = txn.payerTotal - fboActiveBalance;
    const feeRemaining =
      txn.totalFee - (totals.fee.completed + totals.fee.pending);

    console.log(`feeRemaining: `, feeRemaining);

    if (feeRemaining >= 0) {
      // Fund the amount remaining
      const fboHandle = txn.fbo_handle;
      const feeHandle = txn.fee_handle;
      console.log(
        `TXN(${txn.id}) transferring(${feeRemaining}) to ${feeHandle}`
      );
      await funds.transfer(
        fboHandle,
        feeHandle,
        feeRemaining,
        LEDGER_TYPE.TRANSFER_FROM_FBO_TO_FEE,
        txn.id,
        FUND_STATE.FEE_PENDING
      );
    } else {
      if (fundingRemaining > 0) {
        console.log(
          `TXN(${txn.id}) TO_FBO_TRANSFER_COMPLETE -> ISSUE_COMPLETE`
        );
        await TxnController.updateFundState(txn.id, FUND_STATE.NOT_FUNDED);
        throw Error("Transaction is not funded properly!");
      } else {
        throw Error("Fee Error! ");
      }
    }
  }
}

/**
 * Check the accounts in the FEE_PENDING state. If they
 * are done funding, then move up. If fees pending, dont move.
 * If funds insufficient, throw error and move back
 *
 */
async function checkFundFee() {
  // Fetch all TxnController's that are ready for FBO transfers
  const txns = await fetchTransactions(
    FUND_STATE.FEE_PENDING,
    DEAL_STATE.PROGRESS
  );
  console.log(`#TxnControllers: ${txns.length}`);
  for (var i = 0; i < txns.length; i++) {
    const txn: any = txns[i].toJSON();
    console.log("TxnController: ", txn);

    // Total the txn's balance information
    const totals = await totalTxn(txn.id);
    console.log("Totals: ", totals);
    const feeActiveBalance = totals.fee.completed;
    const feePendingBalance = totals.fee.pending;
    const feeEffectiveBalance = feeActiveBalance + feePendingBalance;

    if (feeActiveBalance === txn.totalFee) {
      console.log(
        `TXN(${txn.id}) TO_FBO_TRANSFER_PENDING -> TO_FBO_TRANSFER_COMPLETE`
      );
      await TxnController.updateFundState(txn.id, FUND_STATE.FEE_COMPLETE);
    } else if (feeEffectiveBalance === txn.totalFee) {
      console.log(`TXN(${txn.id}) TO_FBO_TRANSFER_PENDING UNCHANGED`);
    } else {
      console.log(
        `TXN(${txn.id}) TO_FEE_TRANSFER_PENDING -> TO_FBO_TRANSFER_COMPLETE`
      );
      await TxnController.updateFundState(
        txn.id,
        FUND_STATE.TO_FBO_TRANSFER_COMPLETE
      );
      throw Error("Incorrect Funding amount!!");
    }
  }
}
export { fundFee, checkFundFee };

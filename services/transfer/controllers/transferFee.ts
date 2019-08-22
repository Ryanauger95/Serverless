import { fetchTransactions } from "./common";
import { totalTxn } from "../lib/controllers/ledger";
import { FUND_STATE, DEAL_STATE, Txn } from "../lib/models/txn";
import * as bankController from "../lib/controllers/sila";
import { Ledger, LEDGER_STATE, LEDGER_TYPE } from "../lib/models/ledger";

async function fundFee() {
  const txns = await fetchTransactions(
    FUND_STATE.TO_FBO_TRANSFER_COMPLETE,
    DEAL_STATE.PROGRESS
  );
  console.log("#txns: ", txns.length);

  for (var i = 0; i < txns.length; i++) {
    const txn: any = txns[i].toJSON();
    console.log("Txn: ", txn);

    // Total the txn's balance information
    const totals = await totalTxn(txn.id);
    console.log("Totals: ", totals);
    const fboActiveBalance = totals.fbo.completed;
    const fundingRemaining = txn.total - fboActiveBalance;
    const feeRemaining =
      txn.totalFee - (totals.fee.completed + totals.fee.pending);

    console.log(`feeRemaining: `, feeRemaining);

    if (fundingRemaining > 0) {
      console.log(`TXN(${txn.id}) TO_FBO_TRANSFER_COMPLETE -> ISSUE_COMPLETE`);
      await Txn.updateFundState(txn.id, FUND_STATE.ISSUE_COMPLETE);
      throw Error("Not fully funded!");
    } else if (feeRemaining >= 0) {
      // Fund the amount remaining
      const fboHandle = txn.fbo_handle;
      const feeHandle = txn.fee_handle;
      console.log(
        `TXN(${txn.id}) transferring(${feeRemaining}) to ${feeHandle}`
      );
      const res = await bankController.transferSila(
        fboHandle,
        feeHandle,
        feeRemaining
      );
      console.log("Transfer Sila Res: ", res);
      // insert ledger
      // &
      // mark transfer pending
      var trx;
      try {
        trx = await Ledger.transaction.start(Ledger.knex());
        await Ledger.insertLedgerAndUpdateBalanceTrx(
          trx,
          feeHandle,
          fboHandle,
          res.reference,
          LEDGER_TYPE.TRANSFER_TO_FEE,
          feeRemaining,
          LEDGER_STATE.PENDING,
          txn.id
        );
        await Txn.updateFundState(txn.id, FUND_STATE.FEE_PENDING, trx);
        trx.commit();
      } catch (err) {
        console.log("Catastrophic Error: ", err);
        trx.rollback();
      }
    } else {
      throw Error("Error");
    }
  }
}

async function checkFundFee() {
  // Fetch all Txn's that are ready for FBO transfers
  const txns = await fetchTransactions(
    FUND_STATE.FEE_PENDING,
    DEAL_STATE.PROGRESS
  );
  console.log(`#Txns: ${txns.length}`);
  for (var i = 0; i < txns.length; i++) {
    const txn: any = txns[i].toJSON();
    console.log("Txn: ", txn);

    // Total the txn's balance information
    const totals = await totalTxn(txn.id);
    console.log("Totals: ", totals);
    const feeActiveBalance = totals.fee.completed;
    const feePendingBalance = totals.fee.pending;
    const feeEffectiveBalance = feeActiveBalance + feePendingBalance;

    if (feeActiveBalance >= txn.totalFee) {
      console.log(
        `TXN(${txn.id}) TO_FBO_TRANSFER_PENDING -> TO_FBO_TRANSFER_COMPLETE`
      );
      await Txn.updateFundState(txn.id, FUND_STATE.FEE_COMPLETE);
    } else if (feeEffectiveBalance >= txn.totalFee) {
      console.log(`TXN(${txn.id}) TO_FBO_TRANSFER_PENDING UNCHANGED`);
    } else {
      console.log(
        `TXN(${txn.id}) TO_FBO_TRANSFER_PENDING -> TO_FBO_TRANSFER_COMPLETE`
      );
      await Txn.updateFundState(txn.id, FUND_STATE.TO_FBO_TRANSFER_COMPLETE);
    }
  }
}
export { fundFee, checkFundFee };

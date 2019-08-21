import { fetchTransactions } from "./common";
import { totalTxn } from "../lib/controllers/ledger";
import { FUND_STATE, DEAL_STATE, Txn } from "../lib/models/txn";
import * as bankController from "../lib/controllers/sila";
import { Ledger, LEDGER_STATE, LEDGER_TYPE } from "../lib/models/ledger";

async function fundCollector() {
  const txns = await fetchTransactions(
    FUND_STATE.FEE_COMPLETE,
    DEAL_STATE.FINISHED
  );
  console.log("#txns: ", txns.length);

  for (var i = 0; i < txns.length; i++) {
    const txn: any = txns[i].toJSON();
    console.log("Txn: ", txn);

    // Total the txn's balance information
    const totals = await totalTxn(txn.id);
    console.log("Totals: ", totals);
    const collectorActiveBalance = totals.collector.completed;
    const collectorEffectiveBalance =
      collectorActiveBalance + totals.collector.pending;
    const amountRemaining = txn.amount - collectorEffectiveBalance;

    if (amountRemaining < 0) {
      //throw an error here
      console.log("Error.. overfunded");
    }
    if (collectorActiveBalance >= txn.amount) {
      // NOTE: We should throw an error here
      console.log(
        `TXN(${txn.id}) TO_FBO_TRANSFER_COMPLETE -> FROM_FBO_TRANSFER_COMPLETE`
      );
      Txn.updateFundState(txn.id, FUND_STATE.FROM_FBO_TRANSFER_COMPLETE);
    } else if (amountRemaining === 0) {
      console.log(`TXN(${txn.id}) TO_FBO_TRANSFER_COMPLETE -> UNCHANGED`);
    } else {
      // Transfer the difference from the FBO to the User
      // Fund the amount remaining
      const fboHandle = bankController.fboHandle;
      const res = await bankController.transferSila(
        fboHandle,
        txn.collector_handle,
        amountRemaining
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
          txn.collector_handle,
          fboHandle,
          res.reference,
          LEDGER_TYPE.TRANSFER_FROM_FBO,
          amountRemaining,
          LEDGER_STATE.PENDING,
          txn.id
        );
        await Txn.updateFundState(
          txn.id,
          FUND_STATE.FROM_FBO_TRANSFER_PENDING,
          trx
        );

        trx.commit();
      } catch (err) {
        console.log("Catastrophic Error: ", err);
        trx.rollback();
      }
    }
  }
}
async function checkFundCollector() {
  // Fetch all Txn's that are ready for FBO transfers
  const txns = await fetchTransactions(
    FUND_STATE.FROM_FBO_TRANSFER_PENDING,
    DEAL_STATE.FINISHED
  );
  console.log(`#Txns: ${txns.length}`);
  for (var i = 0; i < txns.length; i++) {
    const txn: any = txns[i].toJSON();
    console.log("Txn: ", txn);

    // Total the txn's balance information
    const totals = await totalTxn(txn.id);
    console.log("Totals: ", totals);
    const collectorActiveBalance = totals.collector.completed;
    const collectorPendingBalance = totals.collector.pending;
    const collectorEffectiveBalance =
      collectorActiveBalance + collectorPendingBalance;

    if (collectorActiveBalance >= txn.amount) {
      console.log(
        `TXN(${txn.id}) FROM_FBO_TRANSFER_PENDING -> FROM_FBO_TRANSFER_COMPLETE`
      );
      await Txn.updateFundState(txn.id, FUND_STATE.FROM_FBO_TRANSFER_COMPLETE);
    } else if (collectorEffectiveBalance >= txn.amount) {
      console.log(`TXN(${txn.id}) FROM_FBO_TRANSFER_PENDING UNCHANGED`);
    } else {
      console.log(
        `TXN(${txn.id}) FROM_FBO_TRANSFER_PENDING -> TO_FBO_TRANSFER_COMPLETE`
      );
      await Txn.updateFundState(txn.id, FUND_STATE.TO_FBO_TRANSFER_COMPLETE);
    }
  }
}

export { fundCollector, checkFundCollector };

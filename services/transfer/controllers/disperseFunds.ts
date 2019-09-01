import { fetchTransactions, fetchEndedPendingTransactions } from "./common";
import { totalTxn } from "../lib/controllers/ledger";
import { FUND_STATE, DEAL_STATE, TxnController } from "../lib/controllers/txn";
import * as bankController from "../lib/controllers/sila";
import { Ledger, LEDGER_STATE, LEDGER_TYPE } from "../lib/models/ledger";
import * as funds from "../lib/controllers/funds";

/**
 * For all Transactions that are either in the COMPLETED or CANCELED state,
 * and in fund state FEE_COMPLETE or FROM_FBO_TRANSFER_PENDING,
 * disperse funds according to payer_amount and collector_amount.
 *
 */
async function disperseFunds() {
  const txns = await fetchEndedPendingTransactions();

  console.log("#Txn: ", txns.length);
  for (var i = 0; i < txns.length; i++) {
    const txn: any = txns[i].toJSON();
    console.log("Txn: ", txn);

    const totals = await totalTxn(txn.id);
    console.log("Totals: ", totals);

    // payer vars
    const payerCompleted = totals.payer.completed;
    const payerEffective = totals.payer.completed + totals.payer.pending;
    const payerActiveRemaining = txn.payer_amount - payerCompleted;
    const payerEffectiveRemaining = txn.payer_amount - payerEffective;

    // collector vars
    const collectorCompleted = totals.collector.completed;
    const collectorEffective =
      totals.collector.completed + totals.collector.pending;
    const collectorActiveRemaining = txn.collector_amount - collectorCompleted;
    const collectorEffectiveRemaining =
      txn.collector_amount - collectorEffective;

    if (txn.collector_amount === null || txn.payer_amount === null) {
      throw Error("Collector amount or payer amount is not set!");
    }
    console.log(`${payerEffectiveRemaining} - ${collectorEffectiveRemaining}`);
    if (payerActiveRemaining === 0) {
      if (collectorActiveRemaining === 0) {
        // Mark as FROM_FBO_COMPLETE
        await TxnController.updateFundState(
          txn.id,
          FUND_STATE.FROM_FBO_TRANSFER_COMPLETE
        );
      } else if (collectorEffectiveRemaining === 0) {
        // Mark as FROM_FBO_PENDING
        await TxnController.updateFundState(
          txn.id,
          FUND_STATE.FROM_FBO_TRANSFER_PENDING
        );
      } else if (collectorEffectiveRemaining > 0) {
        // Transfer to collector & Update Ledger
        await funds.transfer(
          txn.fbo_handle,
          txn.collector_handle,
          collectorEffectiveRemaining,
          LEDGER_TYPE.TRANSFER_FROM_FBO_TO_COLLECTOR,
          txn.id,
          FUND_STATE.FROM_FBO_TRANSFER_PENDING
        );
      } else {
        throw Error(
          `Error with collectorEffectiveRemaining: ${collectorEffectiveRemaining})`
        );
      }
    } else if (payerEffectiveRemaining === 0) {
      // Mark as FROM_FBO_PENDING
      await TxnController.updateFundState(
        txn.id,
        FUND_STATE.FROM_FBO_TRANSFER_PENDING
      );
    } else if (payerEffectiveRemaining > 0) {
      await funds.transfer(
        txn.fbo_handle,
        txn.payer_handle,
        payerEffectiveRemaining,
        LEDGER_TYPE.TRANSFER_FROM_FBO_TO_PAYER,
        txn.id,
        FUND_STATE.FROM_FBO_TRANSFER_PENDING
      );
    } else {
      throw Error(
        `Error with payerEffectiveRemaining: ${payerEffectiveRemaining})`
      );
    }
  }
}

export { disperseFunds };

import { TxnController, FUND_STATE, DEAL_STATE } from "../lib/controllers/txn";
import { totalTxn } from "../lib/controllers/ledger";
import {
  fetchTransactions,
  fetchTransactionWalletInfo,
  fetchUnfundedTransactions
} from "./common";
import * as funds from "../lib/controllers/funds";
import { generateKeyPairSync } from "crypto";

class Issue {
  payer_id;
  payer_total;
}

/**
 * For each transaction that is NOT_FUNDED or ISSUE_PENDING,
 * if the payer DOES NOT have enough money,
 * then issue funds into their account.
 *
 */
async function issueFunds() {
  try {
    const txns: any[] = await fetchUnfundedTransactions();

    console.log(`#Txns: ${txns.length}`);

    const txnTable = await buildTxnTable(txns);
    Object.keys(txnTable).forEach(async function(idStr) {
      const id = Number(idStr);
      const payerInfo = txnTable[id];
      const payerEffectiveBalance =
        payerInfo.payer_active_balance + payerInfo.payer_pending_balance;

      const amountRemaining = payerInfo.payer_total - payerEffectiveBalance;

      // Really, the amount remaining isn't the total owed by the
      // payer - effective balance
      // it is
      // (total_owed_payer - total_fbo_completed) - payer_effective_balance

      console.log(
        "payerInfo: ",
        id,
        " payerInfo: ",
        payerInfo,
        " amountRemaining: ",
        amountRemaining
      );

      // Fund the payer amountRemaining
      if (amountRemaining > 0) {
        await funds.issue(payerInfo.payer_handle, amountRemaining, null);
      }

      // mark all txns as ISSUE_PENDING
      // if they are not already
      for (var i = 0; i < payerInfo.txn_info.length; i++) {
        const txnInfo = payerInfo.txn_info[i];
        await markIssuePendingIfNot(txnInfo);
      }
    });
  } catch (err) {
    console.log("Error: ", err);
  }
}

/**
 * Marks txns as issue pending if they are not already
 *
 * @param {*} txnInfo
 */
async function markIssuePendingIfNot(txnInfo) {
  if (txnInfo.fund_state !== FUND_STATE.ISSUE_PENDING) {
    await TxnController.updateFundState(
      txnInfo.txn_id,
      FUND_STATE.ISSUE_PENDING
    );
  }
}

/**
 * Takes in an array of TxnControllers.
 * Builds an object representing the total amount
 * owed by each payer, and his/her balances.
 *
 * @param {TxnController[]} txns
 * @returns
 */
async function buildTxnTable(txns: TxnController[]) {
  // Sort by payer.id, and then for each payer total the amounts
  // needed and issue those amounts in increments
  const obj = {};
  for (var i = 0; i < txns.length; i++) {
    const txn: any = txns[i].toJSON();
    const totals = await totalTxn(txn.id);
    var payerTotal = 0;
    var txnInfo = [
      { txn_id: txn.id, deal_state: txn.deal_state, fund_state: txn.fund_state }
    ];
    if (obj[txn.payer_id]) {
      payerTotal += obj[txn.payer_id].payer_total;
      txnInfo = txnInfo.concat(obj[txn.payer_id]["txn_info"]);
    }
    payerTotal += txn.payerTotal - totals.fbo.completed - totals.fbo.pending;
    obj[txn.payer_id] = {
      payer_handle: txn.payer_handle,
      txn_info: txnInfo,
      payer_total: payerTotal,
      payer_active_balance: txn.payer_active_balance,
      payer_pending_balance: txn.payer_pending_balance
    };
  }
  return obj;
}

export { issueFunds };

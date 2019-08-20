import { Txn, FUND_STATE, DEAL_ROLE, DEAL_STATE } from "../lib/models/txn";
import { KYC_STATE } from "../lib/models/wallet";
import {
  Ledger,
  LEDGER_STATE,
  SILA_HANDLE,
  LEDGER_TYPE
} from "../lib/models/ledger";
import * as bankController from "../lib/controllers/sila";
import { totalTxn } from "../lib/controllers/ledger";
import { fetchTransactions } from "./common";

async function fundFbo() {
  // Fetch all Txn's that are ready for FBO transfers
  const txns: any = await fetchTransactions(
    FUND_STATE.ISSUE_COMPLETE,
    DEAL_STATE.PROGRESS
  );
  console.log(`#Txns: ${txns.length}`);
  for (var i = 0; i < txns.length; i++) {
    const txn = txns[i];
    console.log("Txn: ", txn);

    // Total the txn's balance information
    const totals = await totalTxn(txn.id);
    console.log("Totals: ", totals);
    const fboActiveBalance = totals.fbo.completed;
    const fboPendingBalance = totals.fbo.pending;
    const fboEffectiveBalance = fboActiveBalance + fboPendingBalance;
    const amountRemaining = txn.amount - fboEffectiveBalance;

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
    }
    // Transfer $
    else {
      // Fund the amount remaining
      const fboHandle = bankController.fboHandle;
      const res = await bankController.transferSila(
        txn.payer_handle,
        fboHandle,
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
          fboHandle,
          txn.payer_handle,
          res.reference,
          LEDGER_TYPE.TRANSFER_TO_FBO,
          amountRemaining,
          LEDGER_STATE.PENDING,
          txn.id
        );
        await Txn.updateFundState(
          txn.id,
          FUND_STATE.TO_FBO_TRANSFER_PENDING,
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

async function checkFundFbo() {
  // Fetch all Txn's that are ready for FBO transfers
  const txns: any = await fetchTransactions(
    FUND_STATE.TO_FBO_TRANSFER_PENDING,
    DEAL_STATE.PROGRESS
  );
  console.log(`#Txns: ${txns.length}`);
  for (var i = 0; i < txns.length; i++) {
    const txn = txns[i];
    console.log("Txn: ", txn);

    // Total the txn's balance information
    const totals = await totalTxn(txn.id);
    console.log("Totals: ", totals);
    const fboActiveBalance = totals.fbo.completed;
    const fboPendingBalance = totals.fbo.pending;
    const fboEffectiveBalance = fboActiveBalance + fboPendingBalance;
    const amountRemaining = txn.amount - fboEffectiveBalance;

    // Total the payer's balance information
    const payerActiveBalance = txn.payer_active_balance;

    if (fboActiveBalance >= txn.amount) {
      console.log(
        `TXN(${txn.id}) TO_FBO_TRANSFER_PENDING -> TO_FBO_TRANSFER_COMPLETE`
      );
      await Txn.updateFundState(txn.id, FUND_STATE.TO_FBO_TRANSFER_COMPLETE);
    } else if (fboEffectiveBalance >= txn.amount) {
      console.log(`TXN(${txn.id}) TO_FBO_TRANSFER_PENDING UNCHANGED`);
    } else {
      console.log(`TXN(${txn.id}) TO_FBO_TRANSFER_PENDING -> ISSUE_COMPLETE`);
      await Txn.updateFundState(txn.id, FUND_STATE.ISSUE_COMPLETE);
    }
  }
}

export { fundFbo, checkFundFbo };

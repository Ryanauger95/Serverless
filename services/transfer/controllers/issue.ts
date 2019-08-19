import { SilaWallet, KYC_STATE } from "../lib/models/wallet";
import { Txn, FUND_STATE, DEAL_STATE } from "../lib/models/txn";
import {
  Ledger,
  LEDGER_STATE,
  SILA_HANDLE,
  LEDGER_TYPE
} from "../lib/models/ledger";
import * as bankController from "../lib/controllers/sila.js";
import { fetchTransactions } from "./common";

// For each transaction that is not funded,
// if the payer DOES NOT have enough money,
// then issue funds into their account
async function issueFunds() {
  try {
    const txns = await fetchTransactions(FUND_STATE.NOT_FUNDED);
    console.log(`#Txns: ${txns.length}`);

    for (var i = 0; i < txns.length; i++) {
      const txn: any = txns[i];
      const effectiveBalance =
        txn.payer_active_balance + txn.payer_pending_balance;

      // If the user has enough in their account, we
      // mark the txn as ISSUE_COMPLETE
      if (txn.payer_active_balance >= txn.amount) {
        console.log(`TXN(${txn.id}) NOT_FUNDED -> ISSUE_COMPLETE`);
        await Txn.updateFundState(txn.id, FUND_STATE.ISSUE_COMPLETE);
      }
      // If the user will have enough in their account,
      // then mark as issue pending
      else if (effectiveBalance >= txn.amount) {
        console.log(`TXN(${txn.id}) NOT_FUNDED -> ISSUE_PENDING`);
        await Txn.updateFundState(txn.id, FUND_STATE.ISSUE_PENDING);
      } else {
        // Else, fund the payer and mark ISSUE_PENDING
        const fundsRequired = txn.amount - effectiveBalance;
        console.log(`TXN(${txn.id}) issuing ${fundsRequired}`);
        const res = await bankController.issueSila(
          fundsRequired,
          txn.payer_handle
        );
        console.log("Issue Sila Result: ", res);
        if (res.status != "SUCCESS") {
          throw Error(res);
        }

        // Store in ledger
        var trx;
        try {
          trx = await Ledger.transaction.start(Ledger.knex());
          await Ledger.insertLedgerAndUpdateBalanceTrx(
            trx,
            txn.payer_handle,
            SILA_HANDLE,
            res.reference,
            LEDGER_TYPE.ISSUE,
            fundsRequired,
            LEDGER_STATE.PENDING,
            txn.id
          );
          await Txn.updateFundState(txn.id, FUND_STATE.ISSUE_PENDING, trx);
          trx.commit();
        } catch (err) {
          trx.rollback();
          console.log(
            `ISSUE,PAYER:${txn.payer_handle},REFERENCE:${
              res.reference
            },FUNDS:${fundsRequired},TXN:${txn.id}`
          );
          console.log("Catastrophic Error: ", err);
        }
        // .catch(err => {
        //   console.log("Error issuing funds: ", err);
        // });
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
    const txns = await fetchTransactions(FUND_STATE.ISSUE_PENDING);

    for (var i = 0; i < txns.length; i++) {
      const txn: any = txns[i];
      const effectiveBalance =
        txn.payer_active_balance + txn.payer_pending_balance;

      // If the user has enough in their account, we
      // mark the txn as ISSUE_COMPLETE
      if (txn.payer_active_balance >= txn.amount) {
        console.log(`TXN(${txn.id}) ISSUE_PENDING -> ISSUE_COMPLETE`);
        await Txn.updateFundState(txn.id, FUND_STATE.ISSUE_COMPLETE);
      }
      // If the user will have enough in their account,
      // then mark as issue pending
      else if (effectiveBalance >= txn.amount) {
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

// Select all NOT_FUNDED
function fetchNotFundedTransactions() {
  return fetchTransactions(FUND_STATE.NOT_FUNDED);
}

export { issueFunds, checkIssued };

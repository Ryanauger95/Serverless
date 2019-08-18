import { SilaWallet, KYC_STATE } from "../lib/models/wallet";
import { Txn, FUND_STATE } from "../lib/models/txn";
import {
  Ledger,
  LEDGER_STATE,
  SILA_HANDLE,
  LEDGER_TYPE
} from "../lib/models/ledger";
import * as bankController from "../lib/controllers/sila.js";

// For each transaction that is not funded,
// if the payer DOES NOT have enough money,
// then issue funds into their account
async function issueFunds() {
  try {
    // Select all transactions in which
    // 1) The payer's KYC has completed and
    // 2) The payer's bank has been linked and
    // 3) The txn is in a NOT_FUNDED state
    const txns = await fetchNotFundedTransactions();
    console.log("Un-Funded Transactions: ", txns);

    // If active balance + pending balance < amount, issue funds
    for (var i = 0; i < txns.length; i++) {
      const txn: any = txns[i];
      const effectiveBalance =
        txn.payer_active_balance + txn.payer_pending_balance;

      // If the user has enough in their account, we
      // do NOT fund the account
      if (effectiveBalance >= txn.amount) {
        console.log(
          `User has enough funds in the account(${
            txn.payer_active_balance
          })/pending(${txn.payer_pending_balance}) to cover the amount(${
            txn.amount
          })`
        );
        return;
      }

      // Else, fund the payer
      const fundsRequired = txn.amount - effectiveBalance;
      bankController
        .issueSila(fundsRequired, txn.payer_handle)
        .then(async res => {
          console.log("Issue Sila Result: ", res);
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
            await Txn.query(trx)
              .findById(txn.id)
              .patch({
                fund_state: FUND_STATE.ISSUE_PENDING
              } as any);
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
        });
    }
  } catch (err) {
    console.log("Error: ", err);
  }
}

// Select all transactions in which
// 1) The payer's KYC has completed and
// 2) The txn is in a NOT_FUNDED state
function fetchNotFundedTransactions() {
  return Txn.query()
    .select([
      "txn.*",
      "payer_wallet.handle as payer_handle",
      "payer_wallet.active_balance as payer_active_balance",
      "payer_wallet.pending_balance as payer_pending_balance"
    ])
    .join(
      "sila_wallet as payer_wallet",
      "txn.payer_id",
      "payer_wallet.app_users_id"
    )
    .where({
      "txn.fund_state": FUND_STATE["NOT_FUNDED"],
      "payer_wallet.active": true,
      "payer_wallet.kyc_state": KYC_STATE["COMPLETED"],
      "payer_wallet.bank_linked": true
    });
}

// Return the total amount of month transacted in the
// ledger
async function checkLedger(txnId) {
  var totalFailed: number = 0;
  var totalPending: number = 0;
  var totalComplete: number = 0;

  const ledger: any = await Ledger.query()
    .select("*")
    .where({ txn_id: txnId });
  for (var i = 0; i < ledger.length; i++) {
    const ledgerEntry = ledger[i];
    if (ledgerEntry.state === LEDGER_STATE["PENDING"]) {
      totalPending += ledgerEntry.amount;
    } else if (ledgerEntry.state === LEDGER_STATE["COMPLETED"]) {
      totalComplete += ledgerEntry.amount;
    } else if (ledgerEntry.state === LEDGER_STATE["FAILED"]) {
      totalFailed += ledgerEntry.amount;
    }
  }

  return { totalFailed, totalPending, totalComplete };
}

// Mark Txn Funded
function markFunded(txnId) {
  return Txn.query()
    .findById(txnId)
    .patch({ fund_state: FUND_STATE["FUNDED"] } as any);
}

export { issueFunds };

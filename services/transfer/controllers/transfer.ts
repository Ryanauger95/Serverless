import { Txn, FUND_STATE } from "../lib/models/txn";
import { KYC_STATE } from "../lib/models/wallet";
import {
  Ledger,
  LEDGER_STATE,
  SILA_HANDLE,
  LEDGER_TYPE
} from "../lib/models/ledger";
import * as bankController from "../lib/controllers/sila";

async function fundTransaction() {
  // Fetch all Txn's that are in the PROGRESS_STATE who's
  // funded state is ISSUE_PENDING
  const txns: any = await Txn.query()
    .select([
      "txn.*",
      "payer_wallet.handle as payer_handle",
      "payer_wallet.active_balance as payer_active_balance",
      "payer_wallet.pending_balance as payer_pending_balance"
    ])
    .join("sila_wallet as payer_wallet" as any)
    .where({
      "txn.fund_state": FUND_STATE["ISSUE_PENDING"],
      "payer_wallet.active": true,
      "payer_wallet.kyc_state": KYC_STATE["COMPLETED"],
      "payer_wallet.bank_linked": true
    });
  for (var i = 0; i < txns.length; i++) {
    const txn = txns[i];
    console.log("Txn: ", txn);
    const activeBalance = txn.payer_active_balance;
    const pendingBalance = txn.payer_pending_balance;
    const effectiveBalance = activeBalance + pendingBalance;

    if (activeBalance >= txn.amount) {
      // Begin transfer
      const fboHandle = bankController.fboHandle();
      const res = await bankController.transferToFbo(
        txn.payer_handle,
        txn.amount
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
          txn.payer_handle,
          fboHandle,
          res.reference,
          LEDGER_TYPE.TRANSFER,
          txn.amount,
          LEDGER_STATE.PENDING,
          txn.id
        );
        await Txn.query(trx)
          .findById(txn.id)
          .patch({
            fund_state: FUND_STATE.TRANSFER_PENDING
          } as any);
        trx.commit();
      } catch (err) {
        trx.rollback();
        console.log("Catastrophic Error: ", err);
      }
    } else if (effectiveBalance < txn.amount) {
      // Mark as NOT_FUNDED and throw an error.
      // NOTE: Right now, this could happen because
      // issueFunds doensn't add up all txns by the user
      console.log("Funding issue... not a high enough effective balance");
      await Txn.query()
        .findById(txn.id)
        .update({ fund_state: FUND_STATE.NOT_FUNDED } as any)
        .catch(err => {
          console.log("Error updated fund state in DB! ");
        });
    }
  }
}

export { fundTransaction };

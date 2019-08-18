"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const txn_1 = require("../lib/models/txn");
const wallet_1 = require("../lib/models/wallet");
const ledger_1 = require("../lib/models/ledger");
const bankController = require("../lib/controllers/sila");
async function fundTransaction() {
    // Fetch all Txn's that are in the PROGRESS_STATE who's
    // funded state is ISSUE_PENDING
    const txns = await txn_1.Txn.query()
        .select([
        "txn.*",
        "payer_wallet.handle as payer_handle",
        "payer_wallet.active_balance as payer_active_balance",
        "payer_wallet.pending_balance as payer_pending_balance"
    ])
        .join("sila_wallet as payer_wallet")
        .where({
        "txn.fund_state": txn_1.FUND_STATE["ISSUE_PENDING"],
        "payer_wallet.active": true,
        "payer_wallet.kyc_state": wallet_1.KYC_STATE["COMPLETED"],
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
            const res = await bankController.transferToFbo(txn.payer_handle, txn.amount);
            console.log("Transfer Sila Res: ", res);
            // insert ledger
            // &
            // mark transfer pending
            var trx;
            try {
                trx = await ledger_1.Ledger.transaction.start(ledger_1.Ledger.knex());
                await ledger_1.Ledger.insertLedgerAndUpdateBalanceTrx(trx, txn.payer_handle, fboHandle, res.reference, ledger_1.LEDGER_TYPE.TRANSFER, txn.amount, ledger_1.LEDGER_STATE.PENDING, txn.id);
                await txn_1.Txn.query(trx)
                    .findById(txn.id)
                    .patch({
                    fund_state: txn_1.FUND_STATE.TRANSFER_PENDING
                });
                trx.commit();
            }
            catch (err) {
                trx.rollback();
                console.log("Catastrophic Error: ", err);
            }
        }
        else if (effectiveBalance < txn.amount) {
            // Mark as NOT_FUNDED and throw an error.
            // NOTE: Right now, this could happen because
            // issueFunds doensn't add up all txns by the user
            console.log("Funding issue... not a high enough effective balance");
            await txn_1.Txn.query()
                .findById(txn.id)
                .update({ fund_state: txn_1.FUND_STATE.NOT_FUNDED })
                .catch(err => {
                console.log("Error updated fund state in DB! ");
            });
        }
    }
}
exports.fundTransaction = fundTransaction;

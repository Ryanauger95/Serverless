import { Txn, FUND_STATE, DEAL_STATE } from "../lib/models/txn";
import { KYC_STATE } from "../lib/models/wallet";

// 1) The payer's KYC has completed and
// 2) The txn is in a ${fundState} state
// 3) The txn is in an ACCEPTED or higher state
// 3) The payer's bank has been linked
// 4) the wallet is active
function fetchTransactions(fundState: FUND_STATE) {
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
      "txn.fund_state": fundState,
      "payer_wallet.active": true,
      "payer_wallet.kyc_state": KYC_STATE.COMPLETED,
      "payer_wallet.bank_linked": true
    })
    .andWhere("txn.deal_state", ">=", DEAL_STATE.PROGRESS);
}

export { fetchTransactions };

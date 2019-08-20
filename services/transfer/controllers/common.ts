import { Txn, FUND_STATE, DEAL_STATE } from "../lib/models/txn";
import { KYC_STATE } from "../lib/models/wallet";

// 1) The payer's KYC has completed and
// 2) The txn is in a ${fundState} state
// 3) The txn is in an ACCEPTED or higher state
// 3) The payer's bank has been linked
// 4) the wallet is active
function fetchTransactions(fundState: FUND_STATE, dealState: DEAL_STATE) {
  const where = {};
  const select = ["txn.*"];
  const join = { table: null, cond1: null, cond2: null };
  if (dealState <= DEAL_STATE.PROGRESS) {
    where["payer_wallet.active"] = true;
    where["payer_wallet.kyc_state"] = KYC_STATE.COMPLETED;
    where["payer_wallet.bank_linked"] = true;

    select.push("payer_wallet.handle as payer_handle");
    select.push("payer_wallet.active_balance as payer_active_balance");
    select.push("payer_wallet.pending_balance as payer_pending_balance");

    join["table"] = "sila_wallet as payer_wallet";
    join["cond1"] = "txn.payer_id";
    join["cond2"] = "payer_wallet.app_users_id";
  } else {
    where["collector_wallet.active"] = true;
    where["collector_wallet.kyc_state"] = KYC_STATE.COMPLETED;
    where["collector_wallet.bank_linked"] = true;
    select.push("collector_wallet.handle as collector_handle");
    select.push("collector_wallet.active_balance as collector_active_balance");
    select.push(
      "collector_wallet.pending_balance as collector_pending_balance"
    );
    // ]);
    join["table"] = "sila_wallet as collector_wallet";
    join["cond1"] = "txn.collector_id";
    join["cond2"] = "collector_wallet.app_users_id";
  }

  return Txn.query()
    .select(select)
    .join(join.table, join.cond1, join.cond2)
    .where(where)
    .andWhere({ "txn.fund_state": fundState, "txn.deal_state": dealState });
}

export { fetchTransactions };

import { TxnController, FUND_STATE, DEAL_STATE } from "../lib/controllers/txn";
import { KYC_STATE } from "../lib/models/wallet";

/**
 * Select all transactions in which
 * 1) The payer's KYC has completed and
 * 2) The txn is in a ${fundState} state
 * 3) The txn is in ${DEAL_STATE}
 * 3) The payer's bank has been linked
 * 4) the wallet is active
 *
 * @returns
 */

function fetchUnfundedTransactions() {
  const where = {};
  const select = ["txn.*"];
  const join = { table: null, cond1: null, cond2: null };

  where["payer_wallet.active"] = true;
  where["payer_wallet.kyc_state"] = KYC_STATE.COMPLETED;
  where["payer_wallet.bank_linked"] = true;
  where["deal_state"] = DEAL_STATE.PROGRESS;

  select.push("payer_wallet.handle as payer_handle");
  select.push("payer_wallet.active_balance as payer_active_balance");
  select.push("payer_wallet.pending_balance as payer_pending_balance");

  join["table"] = "sila_wallet as payer_wallet";
  join["cond1"] = "txn.payer_id";
  join["cond2"] = "payer_wallet.app_users_id";

  return TxnController.query()
    .select(select)
    .join(join.table, join.cond1, join.cond2)
    .where(where)
    .andWhere(function() {
      this.orWhere("txn.fund_state", FUND_STATE.NOT_FUNDED).orWhere(
        "txn.fund_state",
        FUND_STATE.ISSUE_PENDING
      );
    });
}

function fetchTransactionWalletInfo(txnId: number) {
  return TxnController.query()
    .findById(txnId)
    .select([
      "txn.*",
      "payer_wallet.handle as payer_handle",
      "payer_wallet.active_balance as payer_active_balance",
      "payer_wallet.pending_balance as payer_pending_balance",
      "collector_wallet.handle as collector_handle",
      "collector_wallet.active_balance as collector_active_balance",
      "collector_wallet.pending_balance as collector_pending_balance"
    ])
    .join(
      "sila_wallet as payer_wallet",
      "txn.payer_id",
      "payer_wallet.app_users_id"
    )
    .join(
      "sila_wallet as collector_wallet",
      "txn.collector_id",
      "collector_wallet.app_users_id"
    )
    .where({
      "payer_wallet.active": true,
      "payer_wallet.kyc_state": KYC_STATE.COMPLETED,
      "payer_wallet.bank_linked": true
    });
}

/**
 * Select all transactions in which
 * 1) The payer's KYC has completed and
 * 2) The txn is in a ${fundState} state
 * 3) The txn is in ${DEAL_STATE}
 * 3) The payer's bank has been linked
 * 4) the wallet is active
 *
 * @param {FUND_STATE} fundState
 * @param {DEAL_STATE} dealState
 * @returns
 */
function fetchTransactions(fundState: FUND_STATE, dealState: DEAL_STATE) {
  const where = {};
  const select = ["txn.*"];
  const join = { table: null, cond1: null, cond2: null };
  if (dealState === DEAL_STATE.PROGRESS) {
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

    select.push("collector_wallet.active_balance as collector_active_balance");
    select.push(
      "collector_wallet.pending_balance as collector_pending_balance"
    );

    join["table"] = "sila_wallet as collector_wallet";
    join["cond1"] = "txn.collector_id";
    join["cond2"] = "collector_wallet.app_users_id";
  }

  return TxnController.query()
    .select(select)
    .join(join.table, join.cond1, join.cond2)
    .where(where)
    .andWhere({ "txn.fund_state": fundState, "txn.deal_state": dealState });
}

/**
 * Fetch Transactions that have ended (CANCELLED or COMPLETED)
 * in the FEE_COMPLETE or FROM_FBO_TRANSFER_PENDING
 *
 * @returns
 */
function fetchEndedPendingTransactions() {
  return TxnController.query()
    .select([
      "txn.*",
      "payer_wallet.handle as payer_handle",
      "collector_wallet.handle as collector_handle"
    ])
    .join(
      "sila_wallet as payer_wallet",
      "txn.payer_id",
      "payer_wallet.app_users_id"
    )
    .join(
      "sila_wallet as collector_wallet",
      "txn.collector_id",
      "collector_wallet.app_users_id"
    )
    .where({
      "payer_wallet.active": true,
      "payer_wallet.kyc_state": KYC_STATE.COMPLETED,
      "payer_wallet.bank_linked": true,
      "collector_wallet.active": true,
      "collector_wallet.kyc_state": KYC_STATE.COMPLETED,
      "collector_wallet.bank_linked": true
    })
    .andWhere(function() {
      this.orWhere("txn.deal_state", DEAL_STATE.COMPLETE).orWhere(
        "txn.deal_state",
        DEAL_STATE.CANCELLED
      );
    })
    .andWhere(function() {
      this.orWhere("txn.fund_state", FUND_STATE.FEE_COMPLETE).orWhere(
        "txn.fund_state",
        FUND_STATE.FROM_FBO_TRANSFER_PENDING
      );
    });
}
export {
  fetchTransactions,
  fetchEndedPendingTransactions,
  fetchTransactionWalletInfo,
  fetchUnfundedTransactions
};

import { fetchTransactions } from "./common";
import { totalTxn } from "../lib/controllers/ledger";
import { FUND_STATE, DEAL_STATE, Txn } from "../lib/models/txn";
import * as bankController from "../lib/controllers/sila";
import { Ledger, LEDGER_STATE, LEDGER_TYPE } from "../lib/models/ledger";

async function fundFee() {
  const txns: any = await fetchTransactions(
    FUND_STATE.TO_FBO_TRANSFER_COMPLETE,
    DEAL_STATE.FINISHED
  );
  console.log("#txns: ", txns.length);

  for (var i = 0; i < txns.length; i++) {
    const txn = txns[i];
    console.log("Txn: ", txn);

    // Total the txn's balance information
    const totals = await totalTxn(txn.id);
    console.log("Totals: ", totals);
  }
}

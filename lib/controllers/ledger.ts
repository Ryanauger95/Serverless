import { Ledger, LEDGER_STATE, LEDGER_TYPE } from "../models/ledger";
import { SilaWallet, ACCOUNT_TYPE } from "../models/wallet";
import { transaction } from "objection";

// Return the total amount of money transacted in the
// ledger for a txn
async function totalTxn(txnId) {
  const ledger: any = await Ledger.query()
    .select("*")
    .where({ txn_id: txnId });

  const totals = {
    payer: {
      pending: 0,
      completed: 0,
      failed: 0
    },
    fbo: {
      pending: 0,
      completed: 0,
      failed: 0
    },
    collector: {
      pending: 0,
      completed: 0,
      failed: 0
    }
  };

  for (var i = 0; i < ledger.length; i++) {
    const ledgerEntry = ledger[i];
    switch (ledgerEntry.type) {
      case LEDGER_TYPE.ISSUE: {
        if (ledgerEntry.state == LEDGER_STATE.COMPLETED) {
          totals.payer.completed += ledgerEntry.amount;
        } else if (ledgerEntry.state == LEDGER_STATE.PENDING) {
          totals.payer.pending += ledgerEntry.amount;
        } else if (ledgerEntry.state == LEDGER_STATE.FAILED) {
          totals.payer.failed += ledgerEntry.amount;
        }
        break;
      }
      case LEDGER_TYPE.TRANSFER_TO_FBO: {
        if (ledgerEntry.state == LEDGER_STATE.COMPLETED) {
          totals.payer.completed -= ledgerEntry.amount;
          totals.fbo.completed += ledgerEntry.amount;
        } else if (ledgerEntry.state == LEDGER_STATE.PENDING) {
          totals.payer.pending -= ledgerEntry.amount;
          totals.fbo.pending += ledgerEntry.amount;
        } else if (ledgerEntry.state == LEDGER_STATE.FAILED) {
          totals.fbo.failed += ledgerEntry.amount;
        }
        break;
      }
      case LEDGER_TYPE.TRANSFER_FROM_FBO: {
        if (ledgerEntry.state == LEDGER_STATE.COMPLETED) {
          totals.fbo.completed -= ledgerEntry.amount;
          totals.collector.completed += ledgerEntry.amount;
        } else if (ledgerEntry.state == LEDGER_STATE.PENDING) {
          totals.fbo.pending -= ledgerEntry.amount;
          totals.collector.pending += ledgerEntry.amount;
        } else if (ledgerEntry.state == LEDGER_STATE.FAILED) {
          totals.fbo.failed += ledgerEntry.amount;
        }
        break;
      }
      case LEDGER_TYPE.REDEEM: {
        if (ledgerEntry.state == LEDGER_STATE.COMPLETED) {
          totals.collector.completed -= ledgerEntry.amount;
        } else if (ledgerEntry.state == LEDGER_STATE.PENDING) {
          totals.collector.pending -= ledgerEntry.amount;
        } else if (ledgerEntry.state == LEDGER_STATE.FAILED) {
          totals.collector.failed += ledgerEntry.amount;
        }
        break;
      }
    }
  }
  return totals;
}

async function transferType(fromHandle, toHandle) {
  const fboAccounts = (await SilaWallet.query()
    .select("handle")
    .where({ account_type: ACCOUNT_TYPE.FBO })) as any;

  // Check if transfer to
  for (var i = 0; i < fboAccounts.length; i++) {
    const account = fboAccounts[i];
    if (toHandle === account.handle) {
      return LEDGER_TYPE.TRANSFER_TO_FBO;
    } else if (fromHandle === account.handle) {
      return LEDGER_TYPE.TRANSFER_FROM_FBO;
    }
  }
  return LEDGER_TYPE.UNKNOWN;
}

export { totalTxn, transferType };

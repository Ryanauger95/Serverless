import { Ledger, LEDGER_STATE, LEDGER_TYPE } from "../models/ledger";

// Return the total amount of money transacted in the
// ledger for a txn
async function totalTxn(txnId: number) {
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
    fee: {
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
      case LEDGER_TYPE.TRANSFER_FROM_PAYER_TO_FBO: {
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
      case LEDGER_TYPE.TRANSFER_FROM_FBO_TO_COLLECTOR: {
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
      case LEDGER_TYPE.TRANSFER_FROM_FBO_TO_PAYER: {
        if (ledgerEntry.state == LEDGER_STATE.COMPLETED) {
          totals.fbo.completed -= ledgerEntry.amount;
          totals.payer.completed += ledgerEntry.amount;
        } else if (ledgerEntry.state == LEDGER_STATE.PENDING) {
          totals.fbo.pending -= ledgerEntry.amount;
          totals.payer.pending += ledgerEntry.amount;
        } else if (ledgerEntry.state == LEDGER_STATE.FAILED) {
          totals.fbo.failed += ledgerEntry.amount;
        }
        break;
      }
      case LEDGER_TYPE.TRANSFER_FROM_FBO_TO_FEE: {
        if (ledgerEntry.state == LEDGER_STATE.COMPLETED) {
          totals.fbo.completed -= ledgerEntry.amount;
          totals.fee.completed += ledgerEntry.amount;
        } else if (ledgerEntry.state == LEDGER_STATE.PENDING) {
          totals.fbo.pending -= ledgerEntry.amount;
          totals.fee.pending += ledgerEntry.amount;
        } else if (ledgerEntry.state == LEDGER_STATE.FAILED) {
          totals.fbo.failed += ledgerEntry.amount;
        }
        break;
      }
      case LEDGER_TYPE.TRANSFER_FROM_FEE: {
        if (ledgerEntry.state == LEDGER_STATE.COMPLETED) {
          totals.fee.completed -= ledgerEntry.amount;
        } else if (ledgerEntry.state == LEDGER_STATE.PENDING) {
          totals.fee.pending -= ledgerEntry.amount;
        } else if (ledgerEntry.state == LEDGER_STATE.FAILED) {
          totals.fee.failed += ledgerEntry.amount;
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
      default: {
        throw Error(`Decoding ledger type(${ledgerEntry.type})`);
      }
    }
  }
  return totals;
}

export { totalTxn };

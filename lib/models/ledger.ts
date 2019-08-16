import { Model, transaction, knex } from "../handlers/mysql";
import { SilaWallet } from "../models/wallet";

enum LEDGER_STATE {
  UNKNOWN = -2,
  FAILED = -1,
  PENDING = 0,
  COMPLETED = 1
}

enum LEDGER_TYPE {
  UNKNOWN = -1,
  ISSUE = 0,
  TRANSFER = 1,
  REDEEM = 2
}

const SILA_HANDLE = "SILA_ISSUED";

class Ledger extends Model {
  // The insert function simply requires that
  // we first insure that no other entry
  // has app_users_id & active = 1
  static get tableName() {
    return "ledger";
  }

  // ACID transaction for updating the ledger.
  // NOTE: All ledger updates must run through this function
  // so that balance updates are properly made
  static updateLedgerAndBalance(
    id,
    { toHandle, fromHandle, reference, type, amount, state }
  ) {
    return transaction(knex, async trx => {
      await Ledger.query(trx)
        .findById(id)
        .upsertGraph({
          id: id,
          reference: reference,
          type: type,
          from_handle: fromHandle,
          to_handle: toHandle,
          amount: amount,
          state: state
        } as any);

      // If the state is completed, then update the
      // wallet balance to reflect the new transaction
      if (state !== LEDGER_STATE.COMPLETED) {
        return;
      }
      switch (type) {
        // Takes ACH transfer, converts to sila token(+)
        case LEDGER_TYPE.ISSUE: {
          const balanceQuery = this.raw("balance +" + String(amount));
          await SilaWallet.query(trx)
            .patch({
              balance: balanceQuery
            } as any)
            .where({
              handle: toHandle
            });
          break;
        }

        // Transfers sila token back to SILA in exchange for $
        case LEDGER_TYPE.REDEEM: {
          const balanceQuery = this.raw("balance -" + String(amount));
          await SilaWallet.query(trx)
            .patch({
              balance: balanceQuery
            } as any)
            .where({
              handle: fromHandle
            });
          break;
        }

        // Transfer from one SILA Address to Another
        case LEDGER_TYPE.TRANSFER: {
          const fromBalance = this.raw("balance -" + String(amount));
          const toBalance = this.raw("balance +" + String(amount));
          await SilaWallet.query(trx)
            .patch({
              balance: toBalance
            } as any)
            .where({
              handle: toHandle
            });
          await SilaWallet.query(trx)
            .patch({
              balance: fromBalance
            } as any)
            .where({
              handle: fromHandle
            });
          break;
        }
      }

      // await SilaWallet.query().
    });
  }
}

export { Ledger, LEDGER_STATE, LEDGER_TYPE, SILA_HANDLE };

import { Model, transaction, knex } from "../handlers/mysql";
import { SilaWallet } from "../models/wallet";
import { stat } from "fs";

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

  // ACID transaction for updating the ledger and
  // wallets' pending and active balances
  // NOTE: All ledger updates must run through this function
  // so that balance updates are properly made
  static insertLedgerAndUpdateBalance(
    toHandle,
    fromHandle,
    reference,
    type,
    amount,
    state,
    txnId
  ) {
    return transaction(knex, async trx => {
      await Ledger.query(trx).insert({
        to_handle: toHandle,
        from_handle: fromHandle,
        reference: reference,
        type: type,
        amount: amount,
        state: state,
        txn_id: txnId
      } as any);

      // If the state is failed, and it doesnt already exits,
      // then we don't have to worry about users' balances
      if (state === LEDGER_STATE.FAILED) {
        return;
      }

      // Update the users' balances
      // NOTE: If completed, we do not have to modify pending
      //  because the transaction does not already exist as pending
      // and the reference # is unique
      switch (type) {
        // Takes ACH transfer, converts to sila token
        // Completed: (+ active)
        // Pending: (+ pending)
        case LEDGER_TYPE.ISSUE: {
          var balanceType: string =
            state === LEDGER_STATE.COMPLETED
              ? "active_balance"
              : "pending_balance";
          const patchJSON = {};
          patchJSON[balanceType] = this.raw(
            balanceType + " + " + String(amount)
          );
          await SilaWallet.query(trx)
            .patch(patchJSON as any)
            .where({
              handle: toHandle
            });
          break;
        }

        // Transfers sila token back to SILA in exchange for $
        // Completed: (- active)
        // Pending: (- pending)
        case LEDGER_TYPE.REDEEM: {
          var balanceType: string =
            state === LEDGER_STATE.COMPLETED
              ? "active_balance"
              : "pending_balance";
          const patchJSON = {};
          patchJSON[balanceType] = this.raw(
            balanceType + " - " + String(amount)
          );
          await SilaWallet.query(trx)
            .patch(patchJSON as any)
            .where({
              handle: fromHandle
            });
          break;
        }

        // Transfer from one SILA Address to Another
        // toHandle:
        //   Completed: (+ active)
        //   Pending: (+ pending)
        // fromHandle:
        //   Completed: (-active)
        //   Pending: (- pending))
        case LEDGER_TYPE.TRANSFER: {
          // Update the ToHandle Wallet
          var balanceType: string =
            state === LEDGER_STATE.COMPLETED
              ? "active_balance"
              : "pending_balance";
          const patchToHandleJSON = {};
          patchToHandleJSON[balanceType] = this.raw(
            balanceType + " + " + String(amount)
          );

          await SilaWallet.query(trx)
            .patch(patchToHandleJSON as any)
            .where({
              handle: toHandle
            });

          // Update the FromHandle Wallet
          var balanceType: string =
            state === LEDGER_STATE.COMPLETED
              ? "active_balance"
              : "pending_balance";
          const patchFromHandleJSON = {};
          patchFromHandleJSON[balanceType] = this.raw(
            balanceType + " - " + String(amount)
          );

          await SilaWallet.query(trx)
            .patch(patchFromHandleJSON as any)
            .where({
              handle: fromHandle
            });
          break;
        }
      }
    });
  }

  // ACID transaction for updating the ledger.
  // NOTE: All ledger updates must run through this function
  // so that balance updates are properly made
  static updateLedgerAndBalance(id, ledgerUpdate) {
    const {
      toHandle,
      fromHandle,
      reference,
      type,
      amount,
      state
    } = ledgerUpdate;

    return transaction(knex, async trx => {
      const oldLedgerEntry: any = await Ledger.query(trx).findById(id);
      const oldState = oldLedgerEntry.state;

      // If the states haven't actually changed, throw a big error
      if (oldState == state) {
        throw Error(`States unchanged: old(${oldState}) new(${state})!`);
      }
      // If the states have changed from a completed or failed state,
      // throw a major error
      if (
        oldState !== LEDGER_STATE.PENDING ||
        (state !== LEDGER_STATE.COMPLETED && state !== LEDGER_STATE.FAILED)
      ) {
        throw Error("States misaligned!");
      }

      // State Change validated.
      // Update the ledger
      await this.updateEntryState(id, ledgerUpdate, trx);

      // Update the users' balances
      switch (type) {
        // Takes ACH transfer, converts to sila token
        // Completed: (+ active, - pending)
        // Failed: (- pending)
        case LEDGER_TYPE.ISSUE: {
          const patchJSON = {
            pending_balance: this.raw("pending_balance -" + String(amount))
          };
          if (state === LEDGER_STATE.COMPLETED) {
            patchJSON["active_balance"] = this.raw(
              "active_balance +" + String(amount)
            );
          }
          await SilaWallet.query(trx)
            .patch(patchJSON as any)
            .where({
              handle: toHandle
            });
          break;
        }

        // Transfers sila token back to SILA in exchange for $
        // Completed: (- active, +pending)
        // Failed:: (+ pending)
        case LEDGER_TYPE.REDEEM: {
          const patchJSON = {
            pending_balance: this.raw("pending_balance +" + String(amount))
          };
          if (state === LEDGER_STATE.COMPLETED) {
            patchJSON["active_balance"] = this.raw(
              "active_balance -" + String(amount)
            );
          }
          await SilaWallet.query(trx)
            .patch(patchJSON as any)
            .where({
              handle: fromHandle
            });
          break;
        }

        // Transfer from one SILA Address to Another
        // toHandle:
        //   Completed: (+ active, - pending)
        //   Failed: (- pending)
        // fromHandle:
        //   Completed: (-active, +pending)
        //   Failed: (+ pending)
        case LEDGER_TYPE.TRANSFER: {
          // Update the ToHandle Wallet
          const patchToHandleJSON = {
            pending_balance: this.raw("pending_balance -" + String(amount))
          };
          if (state === LEDGER_STATE.COMPLETED) {
            patchToHandleJSON["active_balance"] = this.raw(
              "active_balance +" + String(amount)
            );
          }

          await SilaWallet.query(trx)
            .patch(patchToHandleJSON as any)
            .where({
              handle: toHandle
            });

          // Update the FromHandle Wallet
          const patchFromHandleJSON = {
            pending_balance: this.raw("pending_balance +" + String(amount))
          };
          if (state === LEDGER_STATE.COMPLETED) {
            patchFromHandleJSON["active_balance"] = this.raw(
              "active_balance -" + String(amount)
            );
          }

          await SilaWallet.query(trx)
            .patch(patchFromHandleJSON as any)
            .where({
              handle: fromHandle
            });
          break;
        }
      }
    });
  }
  // Update the ledger entry's state
  // This will fail if the entry DNE already
  // NOTE: This query ensures that all fields match except for
  // the state
  static updateEntryState(
    id,
    { toHandle, fromHandle, reference, type, amount, state },
    trx
  ) {
    // Update a ledger entry.
    return Ledger.query(trx)
      .update({
        state: state
      } as any)
      .where({
        id: id,
        reference: reference,
        type: type,
        from_handle: fromHandle,
        to_handle: toHandle,
        amount: amount
      })
      .andWhere("state", "!=", state);
  }
}

export { Ledger, LEDGER_STATE, LEDGER_TYPE, SILA_HANDLE };

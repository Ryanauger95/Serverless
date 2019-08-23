import { BaseModel } from "../handlers/mysql";
import { SilaWallet } from "../models/wallet";

enum LEDGER_STATE {
  UNKNOWN = "UNKNOWN",
  FAILED = "FAILED",
  PENDING = "PENDING",
  COMPLETED = "COMPLETED"
}

enum LEDGER_TYPE {
  UNKNOWN = "UNKNOWN",
  ISSUE = "ISSUE",
  TRANSFER_FROM_PAYER_TO_FBO = "TRANSFER_FROM_PAYER_TO_FBO",
  TRANSFER_FROM_FBO_TO_PAYER = "TRANSFER_FROM_FBO_TO_PAYER",
  TRANSFER_FROM_FBO_TO_COLLECTOR = "TRANSFER_FROM_FBO_TO_COLLECTOR",
  TRANSFER_FROM_FBO_TO_FEE = "TRANSFER_FROM_FBO_TO_FEE",
  TRANSFER_FROM_FEE = "TRANSFER_FROM_FEE",
  REDEEM = "REDEEM"
}

class Ledger extends BaseModel {
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
  static async insertLedgerAndUpdateBalance(
    toHandle,
    fromHandle,
    reference,
    type,
    amount,
    state,
    txnId
  ) {
    var trx;
    try {
      trx = await Ledger.transaction.start(Ledger.knex());
      await this.insertLedgerAndUpdateBalanceTrx(
        trx,
        toHandle,
        fromHandle,
        reference,
        type,
        amount,
        state,
        txnId
      );
      trx.commit();
    } catch (err) {
      trx.rollback();
      throw Error("Error adding!");
    }
  }
  static async insertLedgerAndUpdateBalanceTrx(
    trx,
    fromHandle,
    toHandle,
    reference,
    type,
    amount,
    state,
    txnId
  ) {
    await Ledger.query(trx).insert({
      to_handle: toHandle,
      from_handle: fromHandle,
      reference: reference,
      type: type,
      amount: amount,
      state: state,
      txn_id: txnId
    } as any);

    await this.updateWalletBalances(
      trx,
      fromHandle,
      toHandle,
      type,
      amount,
      state
    );
  }

  static async updateWalletBalances(
    trx,
    fromHandle,
    toHandle,
    type,
    amount,
    state
  ) {
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
        patchJSON[balanceType] = this.raw(balanceType + " + " + String(amount));
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
        patchJSON[balanceType] = this.raw(balanceType + " - " + String(amount));
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
      default: {
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
  }

  // ACID transaction for updating the ledger.
  // NOTE: All ledger updates must run through this function
  // so that balance updates are properly made
  static async updateLedgerAndBalance(
    id,
    toHandle,
    fromHandle,
    reference,
    type,
    amount,
    state
  ) {
    var trx;
    try {
      trx = await Ledger.transaction.start(Ledger.knex());
      await this.updateLedgerAndBalanceTrx(
        trx,
        id,
        toHandle,
        fromHandle,
        reference,
        type,
        amount,
        state
      );
      trx.commit();
    } catch (err) {
      trx.rollback();
      throw Error("Error updating!");
    }
  }
  static async updateLedgerAndBalanceTrx(
    trx,
    id,
    toHandle,
    fromHandle,
    reference,
    type,
    amount,
    state
  ) {
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
    await this.updateEntryState(
      trx,
      id,
      toHandle,
      fromHandle,
      reference,
      type,
      state
    );

    await this.updateWalletBalances(
      trx,
      fromHandle,
      toHandle,
      type,
      amount,
      state
    );
  }

  // Update the ledger entry's state
  // This will fail if the entry DNE already
  // NOTE: This query ensures that all fields match except for
  // the state
  static async updateEntryState(
    trx,
    id,
    toHandle,
    fromHandle,
    reference,
    type,
    state
  ) {
    // Update a ledger entry.
    console.log(
      `UPDATE:id=${id},reference=${reference},type=${type},state=${state},toHandle=${toHandle},fromHandle=${fromHandle}`
    );
    const res = await Ledger.query(trx)
      .update({
        state: state,
        update_date: new Date()
      } as any)
      .where({
        id: id,
        reference: reference,
        type: type,
        from_handle: fromHandle,
        to_handle: toHandle
      })
      .andWhere("state", "!=", state);
    if (res === 0) {
      throw Error("update failed!");
    }
  }
}

export { Ledger, LEDGER_STATE, LEDGER_TYPE };

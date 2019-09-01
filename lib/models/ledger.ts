import { BaseModel } from "../handlers/mysql";
import { SilaWallet } from "../models/wallet";

/**
 * Represents the LEDGER_STATE
 *
 * @enum {number}
 */
enum LEDGER_STATE {
  UNKNOWN = "UNKNOWN",
  FAILED = "FAILED",
  PENDING = "PENDING",
  COMPLETED = "COMPLETED"
}

/**
 * Represents the LEDGER_TYPE
 *
 * @enum {number}
 */
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

/**
 * Represents the MySQL ledger object
 *
 * @class Ledger
 * @extends {BaseModel}
 */
class Ledger extends BaseModel {
  // The insert function simply requires that
  // we first insure that no other entry
  // has app_users_id & active = 1
  static get tableName() {
    return "ledger";
  }

  /**
   * ACID transaction for updating the ledger and
   * wallets' pending and active balances
   * NOTE: All ledger updates must run through this function
   * so that balance updates are properly made
   *
   * @static
   * @param {*} toHandle
   * @param {*} fromHandle
   * @param {*} reference
   * @param {*} type
   * @param {*} amount
   * @param {*} state
   * @param {*} txnId
   * @memberof Ledger
   */
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
  /**
   * Same as insertLedgerAndUpdateBalance except with trx
   *
   * @static
   * @param {*} trx
   * @param {*} fromHandle
   * @param {*} toHandle
   * @param {*} reference
   * @param {*} type
   * @param {*} amount
   * @param {*} state
   * @param {*} txnId
   * @memberof Ledger
   */
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
    if (state !== LEDGER_STATE.PENDING) {
      throw Error("Cannot insert a non-pending Txn");
    }
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
    // Update the users' balances
    // NOTE: If completed, we do not have to modify pending
    //  because the transaction does not already exist as pending
    // and the reference # is unique
    // const patchJSON = {

    // };
    const patch: any[] = [];
    switch (type) {
      // Takes ACH transfer, converts to sila token
      // Completed: (+ active, - pending)
      // Pending: (+ pending)
      // Failed: (- pending)
      case LEDGER_TYPE.ISSUE: {
        const patchJSON = {};
        if (state === LEDGER_STATE.COMPLETED) {
          patchJSON["active_balance"] = this.raw(
            "active_balance + " + String(amount)
          );
          patchJSON["pending_balance"] = this.raw(
            "pending_balance - " + String(amount)
          );
        } else if (state === LEDGER_STATE.FAILED) {
          patchJSON["pending_balance"] = this.raw(
            "pending_balance - " + String(amount)
          );
        } else if (state === LEDGER_STATE.PENDING) {
          patchJSON["pending_balance"] = this.raw(
            "pending_balance + " + String(amount)
          );
        }
        patchJSON["handle"] = toHandle;
        patch.push(patchJSON);

        break;
      }

      // Transfers sila token back to SILA in exchange for $
      // Completed: (- active, + pending)
      // Pending: (- pending)
      case LEDGER_TYPE.REDEEM: {
        const patchJSON = {};
        if (state === LEDGER_STATE.COMPLETED) {
          patchJSON["active_balance"] = this.raw(
            "active_balance - " + String(amount)
          );
          patchJSON["pending_balance"] = this.raw(
            "pending_balance + " + String(amount)
          );
        } else if (state === LEDGER_STATE.FAILED) {
          patchJSON["pending_balance"] = this.raw(
            "pending_balance + " + String(amount)
          );
        } else if (state === LEDGER_STATE.PENDING) {
          patchJSON["pending_balance"] = this.raw(
            "pending_balance - " + String(amount)
          );
        }
        patchJSON["handle"] = fromHandle;
        patch.push(patchJSON);
        break;
      }

      // Transfer from one SILA Address to Another
      // toHandle:
      //   Completed: (+ active, - pending)
      //   Pending: (+ pending)
      // fromHandle:
      //   Completed: (-active, +pending)
      //   Pending: (- pending)
      default: {
        // Update the ToHandle Wallet
        const toPatch = {};
        if (state === LEDGER_STATE.COMPLETED) {
          toPatch["active_balance"] = this.raw(
            "active_balance + " + String(amount)
          );
          toPatch["pending_balance"] = this.raw(
            "pending_balance - " + String(amount)
          );
        } else if (state === LEDGER_STATE.FAILED) {
          toPatch["pending_balance"] = this.raw(
            "pending_balance - " + String(amount)
          );
        } else if (state === LEDGER_STATE.PENDING) {
          toPatch["pending_balance"] = this.raw(
            "pending_balance + " + String(amount)
          );
        }
        toPatch["handle"] = toHandle;
        patch.push(toPatch);

        const fromPatch = {};

        // Update the FromHandle Wallet
        if (state === LEDGER_STATE.COMPLETED) {
          fromPatch["active_balance"] = this.raw(
            "active_balance - " + String(amount)
          );
          fromPatch["pending_balance"] = this.raw(
            "pending_balance  + " + String(amount)
          );
        } else if (state === LEDGER_STATE.FAILED) {
          fromPatch["pending_balance"] = this.raw(
            "pending_balance + " + String(amount)
          );
        } else if (state === LEDGER_STATE.PENDING) {
          fromPatch["pending_balance"] = this.raw(
            "pending_balance - " + String(amount)
          );
        }
        fromPatch["handle"] = fromHandle;
        patch.push(fromPatch);
        break;
      }
    }
    for (var i = 0; i < patch.length; i++) {
      const newPatch = patch[i];
      const handle = newPatch.handle;
      delete newPatch.handle;

      const res = await SilaWallet.query(trx)
        .patch(newPatch as any)
        .where({
          handle: handle
        });
      if (res != 1) {
        throw Error("Catastrophic error updating!");
      }
    }
  }

  /**
   * ACID transaction for updating the ledger.
   * NOTE: All ledger updates must run through this function
   * so that balance updates are properly made
   *
   * @static
   * @param {*} id
   * @param {*} toHandle
   * @param {*} fromHandle
   * @param {*} reference
   * @param {*} type
   * @param {*} amount
   * @param {*} state
   * @memberof Ledger
   */
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
  /**
   * Same as updateLedgerAndBalance but you pass in a trx
   *
   * @static
   * @param {*} trx
   * @param {*} id
   * @param {*} toHandle
   * @param {*} fromHandle
   * @param {*} reference
   * @param {*} type
   * @param {*} amount
   * @param {*} state
   * @memberof Ledger
   */
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

  /**
   * Update the ledger entry's state
   * This will fail if the entry DNE already
   * NOTE: This query ensures that all fields match except for
   * the state
   *
   * @static
   * @param {*} trx
   * @param {*} id
   * @param {*} toHandle
   * @param {*} fromHandle
   * @param {*} reference
   * @param {*} type
   * @param {*} state
   * @memberof Ledger
   */
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

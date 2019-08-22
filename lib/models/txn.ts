import { BaseModel, knex } from "../handlers/mysql";
import { SilaWallet } from "./wallet";

enum DEAL_STATE {
  DISPUTE = "DISPUTE",
  TIMEOUT = "TIMEOUT",
  CANCELLED = "CANCELLED",
  PENDING = "PENDING",
  PROGRESS = "PROGRESS",
  REVIEW = "REVIEW",
  COMPLETE = "COMPLETE"
}
enum FUND_STATE {
  NOT_FUNDED = "NOT_FUNDED",
  ISSUE_PENDING = "ISSUE_PENDING",
  ISSUE_COMPLETE = "ISSUE_COMPLETE",
  TO_FBO_TRANSFER_PENDING = "TO_FBO_TRANSFER_PENDING",
  TO_FBO_TRANSFER_COMPLETE = "TO_FBO_TRANSFER_COMPLETE",
  FEE_PENDING = "FEE_PENDING",
  FEE_COMPLETE = "FEE_COMPLETE",
  FROM_FBO_TRANSFER_PENDING = "FROM_FBO_TRANSFER_PENDING",
  FROM_FBO_TRANSFER_COMPLETE = "FROM_FBO_TRANSFER_COMPLETE"
}

class Txn extends BaseModel {
  static get tableName() {
    return "txn";
  }
  /**
   * total is amount + fee + arb fee
   *
   * @readonly
   * @static
   * @memberof Txn
   */
  static get virtualAttributes() {
    return ["total", "totalFee"];
  }
  /**
   *
   *
   * @returns
   * @memberof Txn
   */
  total() {
    const txn: any = this;
    return txn.amount + txn.start_fee + txn.arbitration_fee;
  }
  /**
   *
   *
   * @returns
   * @memberof Txn
   */
  totalFee() {
    const txn: any = this;
    return txn.start_fee + txn.arbitration_fee;
  }

  static get relationMappings() {
    const { User } = require("./user");
    return {
      payer: {
        relation: BaseModel.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: "txn.payer_id",
          to: "app_users.id"
        }
      },
      wallet: {
        relation: BaseModel.ManyToManyRelation,
        modelClass: SilaWallet,
        join: {
          from: "txn.payer_id",
          through: {
            from: "app_users.id",
            to: "sila_wallet.app_users_id"
          },
          to: "sila_wallet.address"
        }
      }
    };
  }
  static saveNew(
    amount,
    startFee,
    reserve,
    description,
    payer,
    collector,
    originator,
    period,
    fboHandle,
    feeHandle
  ) {
    return knex.transaction(async trx => {
      const [txnId] = await trx("txn").insert({
        amount: amount,
        reserve: reserve,
        description: description,
        payer_id: payer,
        collector_id: collector,
        originator_id: originator,
        start_fee: startFee,
        fbo_handle: fboHandle,
        fee_handle: feeHandle
      });
      console.log("Txn_id: ", txnId);

      const [holding_id] = await holdingPeriod(trx, period, txnId);
      console.log("holding id: ", holding_id.insertId);

      return txnId;
    });
  }
  /**
   * Updates the FUND_STATE of a transaction.
   * Optionally provide a trx argument to make this part
   * of a transaction
   *
   * @static
   * @param {number} txnId
   * @param {FUND_STATE} newState
   * @param {*} [trx]
   * @returns
   * @memberof Txn
   */
  static updateFundState(txnId: number, newState: FUND_STATE, trx?: any) {
    return Txn.query(trx)
      .findById(txnId)
      .update({ fund_state: newState } as any);
  }

  /**
   * Marks the transaction as CANCELLED_PENDING_TRANSFER, update
   * canceller_id and return_reserve
   *
   * @static
   * @param {number} txnId
   * @param {number} cancellerId
   * @param {boolean} returnReserve
   * @returns
   * @memberof Txn
   */
  static markCancelled(
    txnId: number,
    cancellerId: number,
    returnReserve: boolean
  ) {
    return Txn.query()
      .findById(txnId)
      .update({
        canceller_id: cancellerId,
        return_reserve: returnReserve,
        deal_state: DEAL_STATE.CANCELLED
      } as any);
  }
}

function retreive(txnId) {
  return knex("txn")
    .select("*")
    .where({ id: txnId });
}

function fee(driver: any, amount: string, txnId: number) {
  return driver("fee_schedule").insert({ total_fee: amount, txn_id: txnId });
}

function holdingPeriod(trx, period, txnId) {
  const date = new Date();
  const dueDate = date.setDate(date.getDate() + period);
  return trx("holding_period").insert({
    period: period,
    due_date: dueDate,
    txn_id: txnId
  });
}

export { Txn, FUND_STATE, DEAL_STATE, retreive };

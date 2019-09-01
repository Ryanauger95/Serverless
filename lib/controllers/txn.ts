import { Txn, DEAL_STATE, FUND_STATE } from "../models/txn";

class TxnController extends Txn {
  /**
   * total is amount + fee + arb fee
   *
   * @readonly
   * @static
   * @memberof TxnControllerController
   */
  static get virtualAttributes() {
    return ["totalFee", "payerTotal", "collectorTotal"];
  }
  /**
   * Total fees owed for a transaction
   *
   * @returns
   * @memberof TxnControllerController
   */
  totalFee() {
    const txn: any = this;
    return txn.start_fee + txn.arbitration_fee;
  }
  /**
   * The total amount owed TO the collector.
   * If the collector is the originator, then they owe the fee
   *
   * @static
   * @returns
   * @memberof TxnControllerController
   */
  collectorTotal() {
    const txn: any = this;
    const collectorFee: number =
      txn.collector_id === txn.originator_id ? txn.totalFee() : 0;
    return txn.amount - collectorFee;
  }

  /**
   * The total amount owed by the payer
   * If the payer is the originator, then they owe the fee
   *
   * @static
   * @returns
   * @memberof TxnControllerController
   */
  payerTotal() {
    const txn: any = this;
    const payerFee = txn.payer_id === txn.originator_id ? txn.totalFee() : 0;
    return txn.amount + payerFee;
  }

  static async saveNew(
    amount,
    startFee,
    reserve,
    description,
    payer,
    collector,
    originator,
    fboHandle,
    feeHandle
  ) {
    var trx;
    try {
      trx = await Txn.transaction.start(Txn.knex());
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

      trx.commit();
      return txnId;
    } catch (err) {
      trx.rollback();
      throw err;
    }
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
   * @memberof TxnController
   */
  static updateFundState(txnId: number, newState: FUND_STATE, trx?: any) {
    console.log(`TXN(${txnId}) moving to fund_state ${newState}`);
    return Txn.query(trx)
      .findById(txnId)
      .update({ fund_state: newState } as any);
  }

  /**
   * Mark the Tnx as in progress
   *
   * @static
   * @param {number} txnId
   * @param {*} [trx]
   * @returns
   * @memberof TxnController
   */
  static markProgress(txnId: number, trx?: any) {
    return Txn.query(trx)
      .findById(txnId)
      .update({ deal_state: DEAL_STATE.PROGRESS } as any);
  }
  /**
   * Update the deal state of the transaction
   *
   * @static
   * @param {number} txnId
   * @param {DEAL_STATE} newState
   * @param {*} [trx]
   * @returns
   * @memberof TxnController
   */
  static markReview(txnId: number, trx?: any) {
    return Txn.query(trx)
      .findById(txnId)
      .update({ deal_state: DEAL_STATE.REVIEW } as any);
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
   * @memberof TxnController
   */
  static markCancelled(
    txnId: number,
    cancellerId: number,
    returnReserve: boolean
  ) {
    const update = {
      canceller_id: cancellerId,
      return_reserve: returnReserve,
      deal_state: DEAL_STATE.CANCELLED,
      cancelled_date: new Date()
    };
    if (returnReserve === true) {
      update["payer_amount"] = Txn.raw("amount - reserve");
      update["collector_amount"] = Txn.raw("reserve");
    } else {
      update["payer_amount"] = Txn.raw("amount");
      update["collector_amount"] = Txn.raw("0");
    }
    return Txn.query()
      .findById(txnId)
      .update(update as any);
  }

  /**
   * Mark the transaction as complete
   *
   * @static
   * @param {number} txnId
   * @param {number} [payerAmount]
   * @param {number} [collectorAmount]
   * @param {*} [trx]
   * @returns
   * @memberof TxnController
   */
  static markComplete(
    txnId: number,
    payerAmount?: number,
    collectorAmount?: number,
    trx?
  ) {
    const update = {
      deal_state: DEAL_STATE.COMPLETE,
      completed_date: new Date()
    };
    if (
      typeof payerAmount === "number" &&
      typeof collectorAmount === "number"
    ) {
      update["payer_amount"] = payerAmount;
      update["collector_amount"] = collectorAmount;
    }
    return Txn.query(trx)
      .findById(txnId)
      .update(update as any);
  }

  /**
   * Mark the transaction as in dispute and set the dispute_date
   *
   * @static
   * @param {number} txnId
   * @param {number} disputeReplyId
   * @param {number} disputePayerAmount
   * @param {number} disputeCollectorAmount
   * @param {*} [trx]
   * @returns
   * @memberof TxnController
   */
  static markDispute(
    txnId: number,
    disputeReplyId: number,
    disputePayerAmount: number,
    disputeCollectorAmount: number,
    trx?: any
  ) {
    return Txn.query(trx)
      .findById(txnId)
      .update({
        dispute_reply_id: disputeReplyId,
        payer_amount: disputePayerAmount,
        collector_amount: disputeCollectorAmount,
        dispute_date: new Date(),
        deal_state: DEAL_STATE.DISPUTE
      } as any);
  }

  /**
   * Finds all transactions along with the collector and payer information
   *
   *
   * @static
   * @param {number} userId
   * @memberof TxnController
   */
  static async findAllUserTxns(userId: number) {
    return await TxnController.query()
      .select([
        "txn.*",
        "payer.first_name as payer_first_name",
        "payer.last_name as payer_last_name",
        "payer.email as payer_email",
        "payer.phone as payer_phone",
        "payer.profile_img_url as payer_profile_img_url",
        "collector.first_name as collector_first_name",
        "collector.last_name as collector_last_name",
        "collector.email as collector_email",
        "collector.phone as collector_phone",
        "collector.profile_img_url as collector_profile_img_url"
      ])
      .join("app_users as payer", "payer.id", "txn.payer_id")
      .join("app_users as collector", "collector.id", "txn.collector_id")
      .where({ payer_id: userId })
      .orWhere({ collector_id: userId });
    // .andWhere(
  }

  /**
   * Find one Txn and the user's info associated with it
   *
   * @static
   * @param {*} txnId
   * @returns
   * @memberof TxnController
   */
  static async findTxn(txnId) {
    return await TxnController.query()
      .findById(txnId)
      .select([
        "txn.*",
        "payer.first_name as payer_first_name",
        "payer.last_name as payer_last_name",
        "payer.email as payer_email",
        "payer.phone as payer_phone",
        "payer.profile_img_url as payer_profile_img_url",
        "collector.first_name as collector_first_name",
        "collector.last_name as collector_last_name",
        "collector.email as collector_email",
        "collector.phone as collector_phone",
        "collector.profile_img_url as collector_profile_img_url"
      ])
      .join("app_users as payer", "payer.id", "txn.payer_id")
      .join("app_users as collector", "collector.id", "txn.collector_id");
  }
}

export { TxnController, DEAL_STATE, FUND_STATE };

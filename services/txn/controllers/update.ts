import { Txn, DEAL_STATE } from "../lib/models/txn";
import * as Joi from "joi";
import { parseAndValidate } from "../lib/handlers/bodyParser";
import { HttpResponse } from "../lib/models/httpResponse";

// POST Body format validator
const schema = Joi.object()
  .keys({
    user_id: Joi.number()
      .integer()
      .required(),
    state_change: Joi.boolean().required(),
    new_state: Joi.string()
      .allow("")
      .optional(),
    dispute_payer_amount: Joi.number()
      .integer()
      .optional(),
    dispute_collector_amount: Joi.number()
      .integer()
      .optional()
  })
  .with("dispute_payer_amount", "dispute_collector_amount");

/**
 * HTTP triggered event. Allows the user to
 *
 * @param {*} {
 *   body: bodyUnvalidated,
 *   pathParameters: { txn_id: txnId }
 * }
 * @returns
 */
async function update({
  body: bodyUnvalidated,
  pathParameters: { txn_id: txnId }
}) {
  console.log("TXNID: ", txnId);

  try {
    // Parse and validate POST body
    const body = parseAndValidate(bodyUnvalidated, schema);
    console.log(bodyUnvalidated);
    const userId = body.user_id;

    //
    const txn: any = await Txn.query().findById(txnId);
    if (
      body.state_change === true &&
      Object.values(DEAL_STATE).includes(body.new_state) &&
      (userId === txn.payer_id || userId === txn.collector_id)
    ) {
      if (txn.deal_state === DEAL_STATE.PROGRESS) {
        await progressStateChange(txn, userId, body.new_state);
        console.log(`Txn state updated to ${body.new_state}`);
      } else if (txn.deal_state === DEAL_STATE.REVIEW) {
        await reviewStateChange(
          txn,
          userId,
          body.new_state,
          body.dispute_payer_amount,
          body.dispute_collector_amount
        );
        console.log(`Txn state updated to ${body.new_state}`);
      } else if (txn.deal_state === DEAL_STATE.DISPUTE) {
        await disputeStateChange(
          txn,
          userId,
          body.new_state,
          body.dispute_payer_amount,
          body.dispute_collector_amount
        );
      } else {
        throw Error(`Bad state: ${body.new_state}`);
      }
    } else {
      console.log(
        "TxnId: ",
        txnId,
        "UserId: ",
        userId,
        " Body: ",
        body,
        " Txn:",
        txn
      );
      throw Error("Error changing updating state");
    }
    return new HttpResponse(200).dump();
  } catch (err) {
    return new HttpResponse(500, err.message).dump();
  }
}

/**
 * Handle the state change while in the dispute state.
 * IF the state did not actually change
 *
 * @param {*} txn
 * @param {number} userId
 * @param {DEAL_STATE} newState
 * @param {number} [disputePayerAmount]
 * @param {number} [disputeCollectorAmount]
 */
async function disputeStateChange(
  txn: any,
  userId: number,
  newState: DEAL_STATE,
  disputePayerAmount?: number,
  disputeCollectorAmount?: number
) {
  if (userId === txn.dispute_reply_id) {
    if (newState === DEAL_STATE.COMPLETE) {
      await Txn.markComplete(txn.id);
    } else if (newState === DEAL_STATE.DISPUTE) {
      await handleDisputeUpdate(
        txn,
        userId,
        disputePayerAmount,
        disputeCollectorAmount
      );
      //TODO: notify
    } else {
      throw Error(`Invalid new state: ${newState}`);
    }
  } else {
    throw Error(
      `This user(${userId}) != ${txn.dispute_reply_id} cannot update state!`
    );
  }
}

/**
 * Check to make sure that disputePayerAmount and disputeCollectorAmount
 * add up to the txn amount and that the collector amount is >= reserve
 *
 * @param {*} txn
 * @param {number} userId
 * @param {number} [disputePayerAmount]
 * @param {number} [disputeCollectorAmount]
 */
async function handleDisputeUpdate(
  txn: any,
  userId: number,
  disputePayerAmount?: number,
  disputeCollectorAmount?: number
) {
  if (
    disputePayerAmount !== undefined &&
    disputeCollectorAmount !== undefined &&
    disputeCollectorAmount >= txn.reserve &&
    disputePayerAmount + disputeCollectorAmount === txn.amount
  ) {
    const disputeReplyId =
      userId === txn.payer_id ? txn.collector_id : txn.payer_id;
    await Txn.markDispute(
      txn.id,
      disputeReplyId,
      disputePayerAmount,
      disputeCollectorAmount
    );
    // TODO: notify peer
  } else {
    throw Error("Bad amounts");
  }
}
/**
 * Handle the state change from progress to another state
 * IF state change is to COMPLETE, mark as COMPLETE and notify
 * IF state change is to DISPUTE, mark as DISPUTE, set dispute params and notify
 *
 * @param {*} txn
 * @param {number} userId
 * @param {DEAL_STATE} newState
 * @param {number} [disputePayerAmount]
 * @param {number} [disputeCollectorAmount]
 */
async function reviewStateChange(
  txn: any,
  userId: number,
  newState: DEAL_STATE,
  disputePayerAmount?: number,
  disputeCollectorAmount?: number
) {
  if (newState === DEAL_STATE.COMPLETE) {
    //Mark as complete
    await Txn.markComplete(txn.id);
    //TODO: notify users
  } else if (newState === DEAL_STATE.DISPUTE) {
    //Mark as in dispute and update dispute params
    await handleDisputeUpdate(
      txn,
      userId,
      disputePayerAmount,
      disputeCollectorAmount
    );
    //TODO: notify
  } else {
    throw Error("Bad amounts!");
  }
}

/**
 * Handle the state change from progress to another state
 * IF state change is to cancel, mark canceled and updated db
 * IF state change is to review, mark review
 * ELSE throw an error, as there are the only allowed state changedf
 *
 * Alway notify the peer of the state change
 *
 * @param {*} txn
 * @param {number} userId
 * @param {DEAL_STATE} newState
 */
async function progressStateChange(
  txn: any,
  userId: number,
  newState: DEAL_STATE
) {
  if (newState === DEAL_STATE.CANCELLED) {
    // Set Canceller id in DB
    // Mark as CANCELED_PENDING_TRANSFER
    const returnReserve = userId === txn.payer_id ? true : false;
    await Txn.markCancelled(txn.id, userId, returnReserve);
    // TODO: Notify Peer
  } else if (newState === DEAL_STATE.REVIEW) {
    if (userId === txn.collector_id) {
      await Txn.markReview(txn.id);
      // TODO: Notify Peer
    } else {
      throw Error("Payer cannot mark as under review!");
    }
  } else {
    throw Error(`TXN(${txn.id}): Invalid transition to state ${newState}`);
  }
}

export { update };

import { TxnController, DEAL_STATE, FUND_STATE } from "../lib/controllers/txn";
import * as Joi from "joi";
import { parseAndValidate } from "../lib/handlers/bodyParser";
import { HttpResponse } from "../lib/models/httpResponse";

// POST Body format validator
const schema = Joi.object()
  .keys({
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
  pathParameters: { txn_id: txnId },
  requestContext: {
    authorizer: { principalId: principalId }
  }
}) {
  console.log("TXNID: ", txnId);

  try {
    // Parse and validate POST body
    const body = parseAndValidate(bodyUnvalidated, schema);
    console.log("Body: ", body);

    //
    const txnNonJSON: any = await TxnController.query().findById(txnId);
    const txn = txnNonJSON.toJSON();
    console.log(`Attempting update state to: ${body.new_state}`);
    if (
      body.state_change === true &&
      Object.values(DEAL_STATE).includes(body.new_state) &&
      (principalId === txn.payer_id || principalId === txn.collector_id)
    ) {
      if (txn.deal_state === DEAL_STATE.PENDING) {
        await pendingStateChange(txn, principalId, body.new_state);
      } else if (txn.deal_state === DEAL_STATE.PROGRESS) {
        if (txn.fund_state === FUND_STATE.FEE_COMPLETE) {
          await progressStateChange(txn, principalId, body.new_state);
        } else {
          throw Error(
            "Cannot update a PROGRESS state until funds have settled"
          );
        }
      } else if (txn.deal_state === DEAL_STATE.REVIEW) {
        await reviewStateChange(
          txn,
          principalId,
          body.new_state,
          body.dispute_payer_amount,
          body.dispute_collector_amount
        );
      } else if (txn.deal_state === DEAL_STATE.DISPUTE) {
        await disputeStateChange(
          txn,
          principalId,
          body.new_state,
          body.dispute_payer_amount,
          body.dispute_collector_amount
        );
      } else {
        throw Error(`Bad state: ${body.new_state}`);
      }
    } else {
      console.log(
        "TxnControllerId: ",
        txnId,
        "UserId: ",
        principalId,
        " Body: ",
        body,
        " TxnController:",
        txn
      );
      throw Error("Error changing updating state");
    }
    return new HttpResponse(200);
  } catch (err) {
    return new HttpResponse(500, err.message);
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
      await TxnController.markComplete(txn.id);
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
    disputePayerAmount + disputeCollectorAmount === txn.collectorTotal
  ) {
    const disputeReplyId =
      userId === txn.payer_id ? txn.collector_id : txn.payer_id;
    await TxnController.markDispute(
      txn.id,
      disputeReplyId,
      disputePayerAmount,
      disputeCollectorAmount
    );
    // TODO: notify peer
  } else {
    throw Error(
      `Bad amounts payer(${disputePayerAmount}) collector(${disputeCollectorAmount}), total: ${txn.collectorTotal}`
    );
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
  if (userId !== txn.payer_id) {
    throw Error("Only the payer can mark complete here!");
  }
  if (newState === DEAL_STATE.COMPLETE) {
    //Mark as complete
    const completePayerAmount = 0;
    const completeCollectorAmount = txn.collectorTotal;
    await TxnController.markComplete(
      txn.id,
      completePayerAmount,
      completeCollectorAmount
    );
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
    throw Error("Bad state!");
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
    await TxnController.markCancelled(txn.id, userId, returnReserve);
    // TODO: Notify Peer
  } else if (newState === DEAL_STATE.REVIEW) {
    if (userId === txn.collector_id) {
      await TxnController.markReview(txn.id);
      // TODO: Notify Peer
    } else {
      throw Error("Payer cannot mark as under review!");
    }
  } else {
    throw Error(`TXN(${txn.id}): Invalid transition to state ${newState}`);
  }
}

async function pendingStateChange(txn: any, userId: any, newState: DEAL_STATE) {
  if (newState === DEAL_STATE.CANCELLED) {
    // mark as cancelled
    await TxnController.markCancelled(txn.id, userId, false);
  } else if (newState === DEAL_STATE.PROGRESS) {
    if (userId !== txn.originator_id) {
      // new state is PROGRESS
      await TxnController.markProgress(txn.id);
    } else {
      // this user cannot mark as in progress
      throw Error("This user cannot mark as in progress!");
    }
  } else {
    throw Error("Invalid State");
  }
}

export { update };

import { Txn, DEAL_STATE } from "../lib/models/txn";
import * as Joi from "joi";
import { parseAndValidate } from "../lib/handlers/bodyParser";

// POST Body format validator
const schema = Joi.object().keys({
  user_id: Joi.integer().required(),
  state_change: Joi.boolean().required(),
  new_state: Joi.string()
    .allow("")
    .optional()
});
async function update(event) {
  let response = {};
  console.log("Event: ", event);

  //
  const txnId = event["pathParameters"]["txn_id"];
  console.log("TXNID: ", txnId);

  // Parse and validate POST body
  const body = parseAndValidate(event.body, schema);

  //
  const txn: any = Txn.query().findById(txnId);
  if (
    body.state_change === true &&
    Object.values(DEAL_STATE).includes(body.new_state) &&
    (body.user_id === txn.payer_id || body.user_id === txn.collector_id)
  ) {
    if (txn.deal_state === DEAL_STATE.PROGRESS) {
      await progressStateChange(txn, body.user_id, body.new_state);
    } else if (txn.deal_state === DEAL_STATE.REVIEW) {
      throw Error(`Penis`);
    } else {
      throw Error(`Bad state: ${body.new_state}`);
    }
  } else {
    throw Error(`No state change...`);
  }
}

async function progressStateChange(txn, userId, newState) {
  if (newState === DEAL_STATE.CANCELLED) {
    // Set Canceller id in DB
    // Mark as CANCELED_PENDING_TRANSFER
    const returnReserve = userId === txn.payer_id ? true : false;
    await Txn.markCancelled(txn.id, userId, returnReserve);
    // Notify Peer
  } else {
    throw Error("Invalid DEAL_STATE");
  }
}

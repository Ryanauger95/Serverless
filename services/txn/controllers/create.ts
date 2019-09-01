import { TxnController, DEAL_STATE } from "../lib/controllers/txn";
import * as Joi from "joi";
import { parseAndValidate } from "../lib/handlers/bodyParser";
import { HttpResponse } from "../lib/models/httpResponse";

// POST Body format validator
const schema = Joi.object().keys({
  amount: Joi.number()
    .integer()
    .required(),
  reserve: Joi.number()
    .integer()
    .required(),
  description: Joi.string().required(),
  payer: Joi.number()
    .integer()
    .required(),
  collector: Joi.number()
    .integer()
    .required(),
  originator: Joi.number()
    .integer()
    .required()
});

async function create({
  requestContext: {
    authorizer: { principalId: principalId }
  },
  body: bodyUnvalidated
}) {
  let response = {};
  try {
    // Parse and validate POST body
    console.log("Body: ", bodyUnvalidated);
    const body = parseAndValidate(bodyUnvalidated, schema);

    // Save TXN
    const fee = body.amount > 10000 ? body.amount * 0.2 : 200;
    const fboHandle = "ryan.test.silamoney.eth";
    const feeHandle = "ryan.test8.silamoney.eth";
    const txnId = await TxnController.saveNew(
      body.amount,
      fee,
      body.reserve,
      body.description,
      body.payer,
      body.collector,
      body.originator,
      fboHandle,
      feeHandle
    );

    // Build reply
    response = {
      statusCode: 200,
      body: JSON.stringify({
        message: "success",
        txn_id: txnId
      })
    };
  } catch (err) {
    console.log("Error: ", err);
    response = {
      statusCode: 400,
      body: JSON.stringify({
        message: err.message
      })
    };
  }
  return response;
}

export { create };

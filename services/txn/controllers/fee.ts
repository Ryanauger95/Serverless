import { TxnController, DEAL_STATE } from "../lib/controllers/txn";
import { User } from "../lib/models/user";
import * as Joi from "joi";
import { parseAndValidate } from "../lib/handlers/bodyParser";
import { HttpResponse } from "../lib/models/httpResponse";

// POST Body format validator
const schema = Joi.object().keys({
  amount: Joi.number()
    .integer()
    .required(),
  originator: Joi.number()
    .integer()
    .required()
});

async function checkFee({ body: bodyUnvalidated }) {
  try {
    // Parse and validate POST body
    console.log("Body: ", bodyUnvalidated);
    const body = parseAndValidate(bodyUnvalidated, schema);
    const fee = calculateFee(body.amount, body.originator);
    return new HttpResponse(200, "", { fee: fee });
  } catch (err) {
    return new HttpResponse(400, err.message);
  }
}

function calculateFee(amount: number, originatorId: number) {
  // const user = User.query().findById(originatorId).select("subscription")
  return Math.ceil(amount > 10000 ? amount * 0.2 : 200);
}

export { calculateFee, checkFee };

import { TxnController } from "../lib/controllers/txn";
import { HttpResponse } from "../lib/models/httpResponse";
import { Txn } from "../lib/models/txn";

/**
 * Returns transaction details for the txnId given
 *
 * @param {*} { pathParameters: { txn_id: txnId } }
 * @returns
 */
async function retreive({
  pathParameters: { txn_id: txnId },
  requestContext: {
    authorizer: { principalId: principalId }
  }
}) {
  try {
    console.log("TXNID: ", txnId);
    const txn: any = await TxnController.findTxn(txnId);
    if (txn === undefined) {
      throw Error("TxnId not found!");
    }

    if (principalId !== txn.payer_id && principalId !== txn.collector_id) {
      throw Error("Unauthorized to make a request for this TxnId!");
    }

    return new HttpResponse(200, "success", txn);
  } catch (err) {
    return new HttpResponse(400, err.message);
  }
}

/**
 * Returns transaction details for all txnIds given
 *
 * @param {*} event
 * @returns
 */
async function allForUser({
  requestContext: {
    authorizer: { principalId: principalId }
  }
}) {
  try {
    const sql = await TxnController.findAllUserTxns(principalId);
    return new HttpResponse(200, "success", sql);
  } catch (err) {
    console.log(err);
    return new HttpResponse(400, err.code);
  }
}

export { retreive, allForUser };

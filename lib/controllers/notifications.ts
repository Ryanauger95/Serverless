import * as SNS from "../handlers/sns";

/**
 * Publish a notification that a ledger entry has just been created
 * TODO: Add to an SQS queue as well
 *
 * @param {*} ledgerEntry
 * @returns
 */
function ledgerAdded(ledgerEntry: any) {
  return SNS.publish(
    SNS.SNS_TOPIC.LEDGER_ADDED,
    JSON.stringify({ id: ledgerEntry.id, type: ledgerEntry.type })
  );
}

export { ledgerAdded };

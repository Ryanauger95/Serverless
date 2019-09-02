import * as SQS from "../handlers/sqs";
import * as SNS from "../handlers/sns";

async function addLedgerEntryToQueue(ledgerEntry: any) {
  SQS.addToQueue(SQS.QUEUE.TRANSACTION);
}

export { addLedgerEntryToQueue };

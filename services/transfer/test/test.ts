import * as funds from "../lib/controllers/funds";
import { LEDGER_STATE, LEDGER_TYPE } from "../lib/models/ledger";
import { FUND_STATE } from "../lib/models/txn";
import { addLedgerEntryToQueue } from "../lib/controllers/queue";
import * as Notification from "../lib/controllers/notifications";
import { SNS } from "aws-sdk";

async function transfer() {
  await funds.transfer(
    "ryan.test4.silamoney.eth",
    "ryan.test.silamoney.eth",
    300,
    LEDGER_TYPE.TRANSFER_FROM_PAYER_TO_FBO,
    69
  );
}

async function sqs() {
  const rsp = await addLedgerEntryToQueue(null);
  console.log("addLedgerEntryToQueue rsp: ", rsp);
}
async function sns() {
  const rsp = await Notification.ledgerAdded({ id: 1 });
  console.log("sns rsp: ", rsp);
}

// transfer();
// sqs();
sns();

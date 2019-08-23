import * as funds from "../lib/controllers/funds";
import { LEDGER_STATE, LEDGER_TYPE } from "../lib/models/ledger";
import { FUND_STATE } from "../lib/models/txn";

async function getTransaction() {
  await funds.transfer(
    "ryan.test4.silamoney.eth",
    "ryan.test.silamoney.eth",
    300,
    LEDGER_TYPE.TRANSFER_FROM_PAYER_TO_FBO,
    69
  );
}

getTransaction();

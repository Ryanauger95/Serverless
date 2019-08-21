import { Ledger, LEDGER_TYPE, LEDGER_STATE } from "../lib/models/ledger";
import { Txn } from "../lib/models/txn";
import { getTransactions } from "../lib/controllers/sila";

async function testInsert() {
  const toHandle = "ryan.test4.silamoney.eth";
  const fromHandle = "SILA_ISSUED";
  const reference = "a90b039d-4130-459d-b428-dd72546c2344";
  const type = LEDGER_TYPE.ISSUE;
  const amount = 10;
  const state = LEDGER_STATE.PENDING;
  const txnId = 58;
  const res = await Ledger.insertLedgerAndUpdateBalance(
    toHandle,
    fromHandle,
    reference,
    type,
    amount,
    state,
    txnId
  );
  console.log("Insert: ", res);
}

async function getTransaction() {
  // const txn = await Txn.query().findById(63);
  // console.log(txn.toJSON());
  const res = await getTransactions("ryan.test4.silamoney.eth");
  console.log(res);
}

getTransaction();

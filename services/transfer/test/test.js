"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ledger_1 = require("../lib/models/ledger");
async function test() {
    const toHandle = "ryan.test4.silamoney.eth";
    const fromHandle = "SILA_ISSUED";
    const reference = "a90b039d-4130-459d-b428-dd72546c2344";
    const type = ledger_1.LEDGER_TYPE.ISSUE;
    const amount = 10;
    const state = ledger_1.LEDGER_STATE.PENDING;
    const txnId = 58;
    const res = await ledger_1.Ledger.insertLedgerAndUpdateBalance(toHandle, fromHandle, reference, type, amount, state, txnId);
    console.log("Insert: ", res);
}
test();

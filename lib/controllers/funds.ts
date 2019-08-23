import { Ledger, LEDGER_TYPE, LEDGER_STATE } from "../models/ledger";
import { FUND_STATE, Txn } from "../models/txn";
import * as bankController from "./sila";

/**
 * Transfers funds fromHandle toHanle
 *
 * Can Throw
 *
 * @param {string} fromHandle
 * @param {string} toHandle
 * @param {number} amount
 * @param {number} [txnId]
 * @param {FUND_STATE} [newFundState]
 */
async function transfer(
  fromHandle: string,
  toHandle: string,
  amount: number,
  ledgerType: LEDGER_TYPE,
  txnId?: number,
  newFundState?: FUND_STATE
) {
  console.log(
    `TXN(${txnId}) transferring: ${amount} from: ${fromHandle} to: ${toHandle}`
  );
  const res = await bankController.transferSila(fromHandle, toHandle, amount);

  console.log("Transfer Sila Res: ", res);
  const { reference } = res;

  await insertLedger(
    fromHandle,
    toHandle,
    reference,
    amount,
    ledgerType,
    txnId,
    newFundState
  );
}

async function issue(
  toHandle: string,
  amount: number,
  txnId?: number,
  newFundState?: FUND_STATE
) {
  console.log(`TXN(${txnId}) issuing: ${amount} to: ${toHandle}`);
  const res = await bankController.issueSila(amount, toHandle);
  console.log("Issue Sila Result: ", res);
  const { reference, status } = res;
  if (status != "SUCCESS") {
    throw Error(res);
  }

  // Store in ledger
  await insertLedger(
    null,
    toHandle,
    reference,
    amount,
    LEDGER_TYPE.ISSUE,
    txnId,
    newFundState
  );
}

async function insertLedger(
  fromHandle: string,
  toHandle: string,
  reference: string,
  amount: number,
  ledgerType: LEDGER_TYPE,
  txnId?: number,
  newFundState?: FUND_STATE
) {
  var trx;
  try {
    trx = await Ledger.transaction.start(Ledger.knex());
    await Ledger.insertLedgerAndUpdateBalanceTrx(
      trx,
      fromHandle,
      toHandle,
      reference,
      ledgerType,
      amount,
      LEDGER_STATE.PENDING,
      txnId
    );
    if (Object.values(FUND_STATE).includes(newFundState)) {
      await Txn.updateFundState(txnId, newFundState, trx);
    }
    trx.commit();
  } catch (err) {
    trx.rollback();
    throw err;
  }
}

export { transfer, issue };

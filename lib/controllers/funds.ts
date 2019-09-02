import { Ledger, LEDGER_TYPE, LEDGER_STATE } from "../models/ledger";
import { FUND_STATE, TxnController } from "../controllers/txn";
import * as Notification from "./notifications";

/**
 * Creates a ledger entry for a transfer of ${amount} cents
 * from ${fromHandle} to ${toHandle}
 * Does not actually begin any transfer, and sets the reference to null
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
  await insertLedger(
    fromHandle,
    toHandle,
    null,
    amount,
    ledgerType,
    txnId,
    newFundState
  );
}

/**
 * Creates a ledger entry for ${amount} cents to the handle ${toHandle}
 * Does not actually begin any issuance, and sets the reference to null
 *
 *
 * @param {string} toHandle
 * @param {number} amount
 * @param {number} [txnId]
 * @param {FUND_STATE} [newFundState]
 */
async function issue(
  toHandle: string,
  amount: number,
  txnId?: number,
  newFundState?: FUND_STATE
) {
  console.log(`TXN(${txnId}) issuing: ${amount} to: ${toHandle}`);

  // Store in ledger
  const ledger: any = await insertLedger(
    null,
    toHandle,
    null,
    amount,
    LEDGER_TYPE.ISSUE,
    txnId,
    newFundState
  );

  // Publish to SNS topic
  await Notification.ledgerAdded(ledger);

  console.log(`LedgerId(${ledger.id})`);
}

/**
 * Inserts a transaction into the ledger
 *
 * @param {string} fromHandle
 * @param {string} toHandle
 * @param {string} reference
 * @param {number} amount
 * @param {LEDGER_TYPE} ledgerType
 * @param {number} [txnId]
 * @param {FUND_STATE} [newFundState]
 */
async function insertLedger(
  fromHandle: string,
  toHandle: string,
  reference: string,
  amount: number,
  ledgerType: LEDGER_TYPE,
  txnId?: number,
  newFundState?: FUND_STATE
): Promise<number> {
  var trx;
  try {
    trx = await Ledger.transaction.start(Ledger.knex());
    const ledger = await Ledger.insertLedgerAndUpdateBalanceTrx(
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
      await TxnController.updateFundState(txnId, newFundState, trx);
    }
    trx.commit();
    return ledger;
  } catch (err) {
    trx.rollback();
    throw err;
  }
}

export { transfer, issue };

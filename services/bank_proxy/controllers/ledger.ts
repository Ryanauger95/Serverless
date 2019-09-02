import { Ledger, LEDGER_STATE } from "../lib/models/ledger";
import { LEDGER_TYPE } from "../../transfer/lib/models/ledger";
import * as Bank from "../lib/controllers/sila";

/**
 * For each ledger entry that is PENDING and has no reference id,
 * execute the ledger entry with the bank
 *
 */
async function execute() {
  const ledgerEntries: any = await Ledger.query()
    .select("id")
    .where({ reference: null, state: LEDGER_STATE.PENDING });

  for (var i = 0; i < ledgerEntries.length; i++) {
    const ledgerEntry = ledgerEntries[i];
    await executeLedgerEntryWithBank(ledgerEntry.id);
  }
}

/**
 * For a given ledger id, begin a locking transaction.
 * Select the ledger entry and if the reference is not set,
 * then perform the desired action and update the ledger
 *
 * @param {number} id
 */
async function executeLedgerEntryWithBank(id: number) {
  var trx;
  try {
    trx = await Ledger.transaction.start(Ledger.knex());
    const ledgerEntry: any = await Ledger.query(trx)
      .findById(id)
      .forUpdate();

    console.log("ledgerEntry: ", ledgerEntry);

    // Exit early if the trx has already been processed
    if (ledgerEntry.reference != null) {
      throw Error("Ledger entry already processed!");
    }

    // Based on the LEDGER_TYPE, issue, transfer, or redeem $
    var rsp;
    switch (ledgerEntry.type) {
      case LEDGER_TYPE.ISSUE: {
        rsp = await Bank.issue(ledgerEntry.amount, ledgerEntry.to_handle, trx);
        break;
      }
      case LEDGER_TYPE.TRANSFER_FROM_PAYER_TO_FBO:
      case LEDGER_TYPE.TRANSFER_FROM_FBO_TO_PAYER:
      case LEDGER_TYPE.TRANSFER_FROM_FBO_TO_COLLECTOR:
      case LEDGER_TYPE.TRANSFER_FROM_FBO_TO_FEE:
      case LEDGER_TYPE.TRANSFER_FROM_FEE: {
        rsp = await Bank.transfer(
          ledgerEntry.from_handle,
          ledgerEntry.to_handle,
          ledgerEntry.amount,
          trx
        );
        break;
      }
      case LEDGER_TYPE.REDEEM: {
        rsp = await Bank.redeem(ledgerEntry.amount, ledgerEntry.to_handle, trx);
        break;
      }
      default: {
        throw Error("Bad ledger type");
      }
    }
    const { reference } = rsp;
    console.log("Reference #: ", reference, " response: ", rsp);

    // Save the reference # in the database
    await Ledger.query(trx)
      .findById(id)
      .update({ reference: reference, begin_date: new Date() } as any);

    trx.commit();
  } catch (err) {
    trx.rollback();
    throw err;
  }
}

/**
 * update
 * For each ledger entry that is PENDING and reference is set,
 * check to see if the state has changed
 * and update the state if it has
 *
 * @returns
 */
async function update() {
  console.log("Checking all pending transfers and updating their states...");

  const ledgerPending: Ledger[] = await Ledger.query()
    .select("*")
    .whereNot({ reference: null })
    .where({
      state: LEDGER_STATE.PENDING
    });
  // .andWhereNot("reference", null);
  // .andWhereNot({ reference: null });

  console.log("pending ledger entries", ledgerPending);
  for (var i: number = 0; i < ledgerPending.length; i++) {
    const pendingLedgerEntry: any = ledgerPending[i];

    // Get all transactions associated with the ledger entry
    // Then, update the state if it changed
    // If there is an error, then it is a big error
    var handle: string = handleForType(pendingLedgerEntry);
    const filter = { reference_id: pendingLedgerEntry.reference };
    const { transactions } = await Bank.getTransactions(handle, filter);
    const [transaction] = transactions;

    if (!transaction) {
      console.log("MASSIVE Error... Transaction not found!");
      return;
    }
    console.log("Transaction: ", transaction);
    // Update the ledger entry state
    const newLedgerState: LEDGER_STATE = transactionStateToLedgerState(
      transaction
    );
    const oldLedgerState: LEDGER_STATE = pendingLedgerEntry.state;
    console.log(
      `oldLedgerState(${oldLedgerState}) newLedgerState(${newLedgerState})`
    );
    if (newLedgerState != oldLedgerState) {
      console.log("Updating state");
      await Ledger.updateLedgerAndBalance(
        pendingLedgerEntry.id,
        newLedgerState
      ).catch(err => {
        console.log("Error: ", err);
      });
    }
  }
}

/****************************************
 * INTERNAL FUNCTIONS
 ****************************************/

// Get the handle that we query for with getTransactions
// based on the transaction type
function handleForType(ledgerEntry: any): string {
  switch (ledgerEntry.type) {
    case LEDGER_TYPE.ISSUE: {
      return ledgerEntry.to_handle;
    }
    default: {
      return ledgerEntry.from_handle;
    }
  }
}

// Translate the bank verbiage into our state verbiage
function transactionStateToLedgerState(transaction: any): LEDGER_STATE {
  switch (transaction.status) {
    case "failed": {
      return LEDGER_STATE["FAILED"];
    }
    case "pending": {
      return LEDGER_STATE["PENDING"];
    }
    case "success": {
      return LEDGER_STATE["COMPLETED"];
    }
    default: {
      return LEDGER_STATE["UNKNOWN"];
    }
  }
}

export { execute };
export { update };

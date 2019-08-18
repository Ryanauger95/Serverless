import {
  Ledger,
  LEDGER_STATE,
  LEDGER_TYPE,
  SILA_HANDLE
} from "../lib/models/ledger";
import { getTransactions } from "../lib/controllers/sila.js";
import { SilaWallet, KYC_STATE } from "../lib/models/wallet";

/****************************************
 * EXTERNAL FUNCTIONS
 ****************************************/

/****************************************
 * updateLedgerEntries
 * For each ledger entry that is PENDING,
 * check to see if the state has changed
 * and update the state if it has
 ****************************************/
async function updateLedgerEntries() {
  console.log("Checking all pending transfers and updating their states...");

  const ledgerPending: Ledger[] = await Ledger.query()
    .select("*")
    .where({
      state: LEDGER_STATE.PENDING
    });

  console.log("pending ledger entries", ledgerPending);
  for (var i: number = 0; i < ledgerPending.length; i++) {
    const pendingLedgerEntry: any = ledgerPending[i];

    // Get all transactions associated with the ledger entry
    // Then, update the state if it changed
    // If there is an error, then it is a big error
    var handle: string = handleForType(pendingLedgerEntry);
    getTransactions(handle)
      .then(async ({ transactions }) => {
        // Select the transaction in question
        const transaction = findTransaction(
          pendingLedgerEntry.reference,
          transactions
        );
        if (!transaction) {
          console.log("MASSIVE Error... Transaction not found!");
          return;
        }
        console.log("Transaction Matched: ", transaction);

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
          const updatedLedgerEntry = transactionToLedgerEntry(transaction);
          const ledgerId = pendingLedgerEntry.id;
          const res = await Ledger.updateLedgerAndBalance(
            pendingLedgerEntry.id,
            pendingLedgerEntry.to_handle,
            pendingLedgerEntry.from_handle,
            transaction.reference_id,
            pendingLedgerEntry.type,
            pendingLedgerEntry.amount,
            newLedgerState
          ).catch(err => {
            console.log("Error: ", err);
          });
        }
      })
      .catch(err => {
        console.log(
          "Error retreiving transactions for handle: ",
          handle,
          " Error: ",
          err
        );
      });
  }
}

/****************************************
 * INTERNAL FUNCTIONS
 ****************************************/

// Search the list of txns for a user and return the transaction in question
// NOTE: This should be replaced by a getTransaction() call to our bank in the future
function findTransaction(referenceId: string, transactionArr: any[]) {
  console.log("len: ", transactionArr.length);
  for (var i = 0; i < transactionArr.length; i++) {
    const transfer = transactionArr[i];
    if (transfer.reference_id === referenceId) {
      return transfer;
    }
    console.log(`Reference Id(${transfer.reference_id} != ${referenceId}`);
  }
  return null;
}

// NOTE: Right now, we are just using the TO_HANDLE in every
// case. BUT there will be an issue if we have to query an FBO account
// that has millions of entries.
function handleForType(ledgerEntry: any): string {
  return ledgerEntry.to_handle;
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

function transactionTypeToLedgerType(transaction: any): LEDGER_TYPE {
  switch (transaction.transaction_type) {
    case "issue": {
      return LEDGER_TYPE.ISSUE;
    }
    case "transfer": {
      return LEDGER_TYPE.TRANSFER;
    }
    case "redeem": {
      return LEDGER_TYPE.REDEEM;
    }
  }
}
function transactionReferenceToLedgerReference(transaction: any): string {
  return transaction.reference_id;
}

function transactionToLedgerHandles(transaction: any) {
  switch (transactionTypeToLedgerType(transaction)) {
    case LEDGER_TYPE.ISSUE: {
      return {
        toHandle: transaction.user_handle,
        fromHandle: SILA_HANDLE
      };
    }
    case LEDGER_TYPE.TRANSFER: {
      return {
        toHandle: null,
        fromHandle: null
      };
    }
    case LEDGER_TYPE.REDEEM: {
      return {
        toHandle: null,
        fromHandle: null
      };
    }
  }
}
function transactionAmountToLedgerAmount(transaction) {
  return transaction.sila_amount / 100;
}

function transactionToLedgerEntry(transaction: any): any {
  const reference = transactionReferenceToLedgerReference(transaction);
  const type = transactionTypeToLedgerType(transaction);
  const { fromHandle, toHandle } = transactionToLedgerHandles(transaction);
  const amount = transactionAmountToLedgerAmount(transaction);
  const state = transactionStateToLedgerState(transaction);
  return {
    reference,
    type,
    fromHandle,
    toHandle,
    amount,
    state
  };
}

export { updateLedgerEntries };

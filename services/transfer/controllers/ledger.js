"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ledger_1 = require("../lib/models/ledger");
const sila_js_1 = require("../lib/controllers/sila.js");
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
    const ledgerPending = await ledger_1.Ledger.query()
        .select("*")
        .where({
        state: ledger_1.LEDGER_STATE.PENDING
    });
    console.log("pending ledger entries", ledgerPending);
    for (var i = 0; i < ledgerPending.length; i++) {
        const pendingLedgerEntry = ledgerPending[i];
        // Get all transactions associated with the ledger entry
        // Then, update the state if it changed
        // If there is an error, then it is a big error
        var handle = handleForType(pendingLedgerEntry);
        sila_js_1.getTransactions(handle)
            .then(async ({ transactions }) => {
            // Select the transaction in question
            const transaction = findTransaction(pendingLedgerEntry.reference, transactions);
            if (!transaction) {
                console.log("MASSIVE Error... Transaction not found!");
                return;
            }
            console.log("Transaction Matched: ", transaction);
            // Update the ledger entry state
            const newLedgerState = transactionStateToLedgerState(transaction);
            const oldLedgerState = pendingLedgerEntry.state;
            console.log(`oldLedgerState(${oldLedgerState}) newLedgerState(${newLedgerState})`);
            if (newLedgerState != oldLedgerState) {
                console.log("Updating state");
                const updatedLedgerEntry = transactionToLedgerEntry(transaction);
                const ledgerId = pendingLedgerEntry.id;
                const res = await ledger_1.Ledger.updateLedgerAndBalance(pendingLedgerEntry.id, pendingLedgerEntry.to_handle, pendingLedgerEntry.from_handle, transaction.reference_id, pendingLedgerEntry.type, pendingLedgerEntry.amount, newLedgerState).catch(err => {
                    console.log("Error: ", err);
                });
            }
        })
            .catch(err => {
            console.log("Error retreiving transactions for handle: ", handle, " Error: ", err);
        });
    }
}
exports.updateLedgerEntries = updateLedgerEntries;
/****************************************
 * INTERNAL FUNCTIONS
 ****************************************/
// Search the list of txns for a user and return the transaction in question
// NOTE: This should be replaced by a getTransaction() call to our bank in the future
function findTransaction(referenceId, transactionArr) {
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
function handleForType(ledgerEntry) {
    return ledgerEntry.to_handle;
}
// Translate the bank verbiage into our state verbiage
function transactionStateToLedgerState(transaction) {
    switch (transaction.status) {
        case "failed": {
            return ledger_1.LEDGER_STATE["FAILED"];
        }
        case "pending": {
            return ledger_1.LEDGER_STATE["PENDING"];
        }
        case "success": {
            return ledger_1.LEDGER_STATE["COMPLETED"];
        }
        default: {
            return ledger_1.LEDGER_STATE["UNKNOWN"];
        }
    }
}
function transactionTypeToLedgerType(transaction) {
    switch (transaction.transaction_type) {
        case "issue": {
            return ledger_1.LEDGER_TYPE.ISSUE;
        }
        case "transfer": {
            return ledger_1.LEDGER_TYPE.TRANSFER;
        }
        case "redeem": {
            return ledger_1.LEDGER_TYPE.REDEEM;
        }
    }
}
function transactionReferenceToLedgerReference(transaction) {
    return transaction.reference_id;
}
function transactionToLedgerHandles(transaction) {
    switch (transactionTypeToLedgerType(transaction)) {
        case ledger_1.LEDGER_TYPE.ISSUE: {
            return {
                toHandle: transaction.user_handle,
                fromHandle: ledger_1.SILA_HANDLE
            };
        }
        case ledger_1.LEDGER_TYPE.TRANSFER: {
            return {
                toHandle: null,
                fromHandle: null
            };
        }
        case ledger_1.LEDGER_TYPE.REDEEM: {
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
function transactionToLedgerEntry(transaction) {
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

import { Model, knex } from "../handlers/mysql";

const LEDGER_STATE = {
  FAILED: -1,
  PENDING: 0,
  COMPLETED: 1
};

const SILA_HANDLE = "SILA_ISSUED";

class Ledger extends Model {
  // The insert function simply requires that
  // we first insure that no other entry
  // has app_users_id & active = 1
  static get tableName() {
    return "ledger";
  }
}

export { Ledger, LEDGER_STATE, SILA_HANDLE };

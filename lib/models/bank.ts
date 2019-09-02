import { BaseModel } from "../handlers/mysql";

class BankAccount extends BaseModel {
  static get tableName() {
    return "bank_account";
  }
}

export { BankAccount };

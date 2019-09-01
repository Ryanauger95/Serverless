import { BaseModel, knex } from "../handlers/mysql";
import { SilaWallet } from "./wallet";

enum DEAL_STATE {
  DISPUTE = "DISPUTE",
  TIMEOUT = "TIMEOUT",
  CANCELLED = "CANCELLED",
  PENDING = "PENDING",
  PROGRESS = "PROGRESS",
  REVIEW = "REVIEW",
  COMPLETE = "COMPLETE"
}
/**
 * Funding state. Describes in which direction funds are currently flowing.
 * Funds can only flow one operation at a time.
 *
 * @enum {number}
 */
enum FUND_STATE {
  NOT_FUNDED = "NOT_FUNDED",
  ISSUE_PENDING = "ISSUE_PENDING",
  TO_FBO_TRANSFER_PENDING = "TO_FBO_TRANSFER_PENDING",
  TO_FBO_TRANSFER_COMPLETE = "TO_FBO_TRANSFER_COMPLETE",
  FEE_PENDING = "FEE_PENDING",
  FEE_COMPLETE = "FEE_COMPLETE",
  FROM_FBO_TRANSFER_PENDING = "FROM_FBO_TRANSFER_PENDING",
  FROM_FBO_TRANSFER_COMPLETE = "FROM_FBO_TRANSFER_COMPLETE"
}

class Txn extends BaseModel {
  static get tableName() {
    return "txn";
  }

  static get relationMappings() {
    const { User } = require("./user");
    return {
      payer: {
        relation: BaseModel.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: "txn.payer_id",
          to: "app_users.id"
        }
      },
      wallet: {
        relation: BaseModel.ManyToManyRelation,
        modelClass: SilaWallet,
        join: {
          from: "txn.payer_id",
          through: {
            from: "app_users.id",
            to: "sila_wallet.app_users_id"
          },
          to: "sila_wallet.address"
        }
      }
    };
  }
}

function retreive(txnId) {
  return knex("txn")
    .select("*")
    .where({ id: txnId });
}

function fee(driver: any, amount: string, txnId: number) {
  return driver("fee_schedule").insert({ total_fee: amount, txn_id: txnId });
}

export { Txn, FUND_STATE, DEAL_STATE, retreive };

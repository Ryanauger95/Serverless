import { BaseModel, knex } from "../handlers/mysql";
import { SilaWallet } from "./wallet";
import { LEDGER_STATE } from "./ledger";
import { transaction } from "objection";

enum DEAL_STATE {
  DISPUTE = -3,
  TIMEOUT = -2,
  CANCELLED = -1,
  PENDING = 0,
  PROGRESS = 1,
  REVIEW = 2,
  FINISHED = 3
}
enum FUND_STATE {
  NOT_FUNDED = 0,
  ISSUE_PENDING = 1,
  ISSUE_COMPLETE = 2,
  TO_FBO_TRANSFER_PENDING = 3,
  TO_FBO_TRANSFER_COMPLETE = 4,
  FROM_FBO_TRANSFER_PENDING = 5,
  FROM_FBO_TRANSFER_COMPLETE = 6
}
const DEAL_ROLE = {
  SENDER: 0,
  RECEIVER: 1
};

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
  static saveNew(
    amount,
    reserve,
    description,
    payer,
    collector,
    originator,
    period
  ) {
    return knex.transaction(async trx => {
      const [txnId] = await trx("txn").insert({
        amount: amount,
        reserve: reserve,
        description: description,
        payer_id: payer,
        collector_id: collector,
        originator_id: originator
      });
      console.log("Txn_id: ", txnId);

      const [fee_id] = await fee(trx, amount, txnId);
      console.log("fee id: ", fee_id);

      const [holding_id] = await holdingPeriod(trx, period, txnId);
      console.log("holding id: ", holding_id.insertId);

      return txnId;
    });
  }
  static updateFundState(txnId: number, newState: FUND_STATE, trx?: any) {
    return Txn.query(trx)
      .findById(txnId)
      .update({ fund_state: newState } as any);
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

function holdingPeriod(trx, period, txnId) {
  const date = new Date();
  const dueDate = date.setDate(date.getDate() + period);
  return trx("holding_period").insert({
    period: period,
    due_date: dueDate,
    txn_id: txnId
  });
}

export { Txn, FUND_STATE, DEAL_ROLE, DEAL_STATE, retreive };

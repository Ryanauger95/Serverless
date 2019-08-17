import { Model, knex } from "../handlers/mysql";
import { SilaWallet } from "./wallet";

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
  FUNDED = 2
}
const DEAL_ROLE = {
  SENDER: 0,
  RECEIVER: 1
};

class Txn extends Model {
  static get tableName() {
    return "txn";
  }
  static get relationMappings() {
    const { User } = require("./user");
    return {
      payer: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: "txn.payer_id",
          to: "app_users.id"
        }
      },
      wallet: {
        relation: Model.ManyToManyRelation,
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
  static markFunded() {
    console.log("Funded");
  }
  static markFundsIssued(txnId) {
    return this.query()
      .findById(txnId)
      .patch({ fund_state: FUND_STATE.ISSUE_PENDING } as any);
  }
}

function retreive(txnId) {
  return knex("txn")
    .select("*")
    .where({ id: txnId });
}

function save(
  amount,
  reserve,
  description,
  payer,
  collector,
  originator,
  period
) {
  return knex.transaction(async trx => {
    const [fee_id] = await fee(trx, amount);
    console.log("fee id: ", fee_id);

    const [holding_id] = await holdingPeriod(trx, period);
    console.log("holding id: ", holding_id.insertId);

    const [txn] = await trx("txn").insert({
      amount: amount,
      reserve: reserve,
      description: description,
      payer_id: payer,
      collector_id: collector,
      originator_id: originator,
      fee_id: fee_id,
      holding_period_id: holding_id.insertId
    });
    console.log("Txn_id: ", txn);
    return txn;
  });
}

function fee(driver: any, amount: string) {
  return driver("fee_schedule").insert({ total_fee: amount });
}

function holdingPeriod(driver, period) {
  const due_date = (Date.now() / 1000 + 60 * 60 * 24 * period) | 0;
  console.log("Due date: ", due_date);
  return driver.raw(
    "INSERT INTO holding_period (period, due_date) \
    VALUES (:period, FROM_UNIXTIME(:due_date))",
    { period: period, due_date: due_date }
  );
}

export { Txn, FUND_STATE, DEAL_ROLE, DEAL_STATE, save, retreive };

// Import DB Connection
// const {Model, knex} = require('../handlers/mysql');
import { BaseModel, knex } from "../handlers/mysql";

enum KYC_STATE {
  UNKNOWN = "UNKNOWN",
  FAILED = "FAILED",
  NOT_STARTED = "NOT_STARTED",
  PENDING = "PENDING",
  COMPLETED = "COMPLETED"
}

enum ACCOUNT_TYPE {
  USER = "USER",
  FBO = "FBO",
  FEE = "FEE"
}

const silaTableName: string = "sila_wallet";
class SilaWallet extends BaseModel {
  // The insert function simply requires that
  // we first insure that no other entry
  // has app_users_id & active = 1
  static get tableName() {
    return silaTableName;
  }

  static get relationMappings() {
    const { User } = require("./user");
    return {
      user: {
        relation: BaseModel.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: "sila_wallet.app_users_id",
          to: "app_users.id"
        }
      }
    };
  }

  static insert(data, check) {
    return knex.transaction(async trx => {
      // Must double check to make sure that we
      // there are no other entries marked as active
      if (check === true) {
        const active = await trx(silaTableName)
          .select(["*"])
          .where({
            app_users_id: data.app_users_id,
            active: 1
          });
        if (active.length != 0) {
          throw Error("Active account already exists");
        }
      }
      await trx(silaTableName).insert(data);
    });
  }
  static getWallet(userId, info) {
    return SilaWallet.query()
      .select(info)
      .findOne({ active: true, app_users_id: userId });
  }

  static getActiveWallets(userId) {
    return knex(silaTableName)
      .select("*")
      .where({ active: true, app_users_id: userId });
  }
  static getWallets(userId) {
    return knex(silaTableName)
      .select("*")
      .where({ active: true, app_users_id: userId });
  }

  static getKYCPending() {
    return knex(silaTableName)
      .select("*")
      .where({ active: true, kyc_state: KYC_STATE["PENDING"] });
  }
}

export { SilaWallet, KYC_STATE, ACCOUNT_TYPE };

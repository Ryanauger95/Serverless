// Import DB Connection
// const {Model, knex} = require('../handlers/mysql');
import { Model, knex } from "../handlers/mysql";

const KYC_STATE = {
  UNKNOWN: -2,
  FAILED: -1,
  NOT_STARTED: 0,
  PENDING: 1,
  COMPLETED: 2
};

const silaTableName: string = "sila_wallet";
class SilaWallet extends Model {
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
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: "sila_wallet.app_users_id",
          to: "app_users.id"
        }
      }
    };
  }

  insert(data, check) {
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
}

async function getWallet(userId) {
  return SilaWallet.query()
    .select("*")
    .where({ active: 1, app_users_id: userId });
}

function getActiveWallets(userId) {
  return knex(silaTableName)
    .select("*")
    .where({ app_users_id: userId, active: 1 });
}
function getWallets(userId) {
  return knex(silaTableName)
    .select("*")
    .where({ app_users_id: userId });
}

function getKYCPending() {
  return knex(silaTableName)
    .select("*")
    .where({ active: 1, kyc_state: KYC_STATE["PENDING"] });
}

// module.exports = {
//   SilaWallet,
//   getWallets,
//   getWallet,
//   getActiveWallets,
//   getKYCPending,
//   KYC_STATE,
// };

export { SilaWallet, KYC_STATE };
// export {getWallet, getWallets, getActiveWallets, getKYCPending}

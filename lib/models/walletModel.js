// Import DB Connection
const {Model, knex} = require('../handlers/mysql');

const silaTableName = 'sila_wallet';

class SilaWallet extends Model {
  // The insert function simply requires that
  // we first insure that no other entry
  // has app_users_id & active = 1
  static get tableName() {
    return silaTableName;
  }
  insert(data, check) {
    return knex.transaction(async (trx) => {
      // Must double check to make sure that we
      // there are no other entries marked as active
      if (check === true) {
        const active = await trx(silaTableName)
            .select(['*'])
            .where(
                {
                  app_users_id: data.app_users_id,
                  active: 1,
                });
        if (active.length != 0) {
          throw Error('Active account already exists');
        }
      }
      await trx(silaTableName).insert(data);
    });
  };
}


function getActiveWallets(userId) {
  return knex([silaTableName])
      .select('*')
      .where({app_users_id: userId, active: 1});
}
function getWallets(userId) {
  return knex([silaTableName])
      .select('*')
      .where({app_users_id: userId});
}

function getKYCPending() {
  return knex([silaTableName])
      .select('*')
      .where({active: 1, kyc_state: 0});
}

module.exports = {
  SilaWallet,
  getWallets,
  getActiveWallets,
  getKYCPending,
};


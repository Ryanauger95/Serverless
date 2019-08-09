// Import DB Connection
const {Model, knex} = require('../handlers/mysql');


// class SilaWallet extends Model {
//   // Table name is the only required property.
//   static get tableName() {
//     return 'sila_wallet';
//   }
// }

class SilaWallet extends Model {
  // The insert function simply requires that
  // we first insure that no other entry
  // has app_users_id & active = 1
  get tableName() {
    return 'sila_wallet';
  }
  insert(data, check) {
    return knex.transaction(async (trx) => {
      // Must double check to make sure that we
      // there are no other entries marked as active
      if (check === true) {
        const active = await trx(this.tableName)
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
      await trx(this.tableName).insert(data);
    });
  };

  fetchByUser(userId) {
    return knex(this.tableName).select('*').where({app_users_id: userId});
  }

  fetchByAddress() {

  }
}


function getActiveWallets(userId) {
  return knex(['sila_wallet'])
      .select('*')
      .where({app_users_id: userId, active: 1});
}
function getWallets(userId) {
  return knex(['sila_wallet'])
      .select('*')
      .where({app_users_id: userId});
}

module.exports = {
  SilaWallet,
  getWallets,
  getActiveWallets,
};


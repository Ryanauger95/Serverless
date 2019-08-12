// Import DB Connection
const {Model, timestamp, asTimestamp} = require('../handlers/mysql');

class User extends Model {
  // Table name is the only required property.
  static get tableName() {
    return 'app_users';
  }
}

function updatePhone(userId, phone, OTC) {
  return User
      .query()
      .findById(userId)
      .update(
          {
            phone: phone,
            phone_validated: false,
            phone_otc: OTC,
            phone_otc_ts: new Date,
          });
}

function getPhoneValidation(userId) {
  return User
      .query()
      .findById(userId)
      // .select(['phone_otc', asTimestamp('phone_otc_ts')]);
      .select(['phone_otc', 'phone_otc_ts']);
}


module.exports = {
  User,
  updatePhone,
  getPhoneValidation,
};


// Import DB Connection
const Model = require('../handlers/mysql').Model;


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
      .select(['phone_otc', 'phone_otc_ts']);
}


module.exports = {
  User: User,
  updatePhone,
  getPhoneValidation,
};


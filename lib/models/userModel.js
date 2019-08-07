// Import DB Connection
const Model = require('../handlers/mysql').Model;

class User extends Model {
  // Table name is the only required property.
  static get tableName() {
    return 'app_users';
  }
}

module.exports = {
  User,
};


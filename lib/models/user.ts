// Import DB Connection
import { Model } from "../handlers/mysql";
import { PartialUpdate } from "objection";

class User extends Model {
  // Table name is the only required property.
  static get tableName() {
    return "app_users";
  }
}

function updatePhone(userId: number, phone: string, OTC: number) {
  return User.query()
    .findById(userId)
    .update({
      phone: phone,
      phone_validated: false,
      phone_otc: OTC,
      phone_otc_ts: new Date()
    } as PartialUpdate<User>);
}

function getPhoneValidation(userId) {
  return User.query()
    .findById(userId)
    .select(["phone_otc", "phone_otc_ts"]);
}

export { User, updatePhone, getPhoneValidation };

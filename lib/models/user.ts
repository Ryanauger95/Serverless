// Import DB Connection
import { BaseModel } from "../handlers/mysql";
import { PartialUpdate } from "objection";

class User extends BaseModel {
  // Table name is the only required property.
  static get tableName() {
    return "app_users";
  }
  static updatePhone(userId: number, phone: string, OTC: string) {
    return User.query()
      .findById(userId)
      .update({
        phone: phone,
        phone_validated: false,
        phone_otc: OTC,
        phone_otc_ts: new Date()
      } as PartialUpdate<User>);
  }
  static getPhoneValidation(userId) {
    return User.query()
      .findById(userId)
      .select(["phone_otc", "phone_otc_ts"]);
  }
  static updateProfilePicUrl(userId: number, url: string) {
    return User.query()
      .findById(userId)
      .update({ profile_img_url: url } as any);
  }
}

export { User };

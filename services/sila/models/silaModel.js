const knex = require('../../../lib/handlers/mysql').knex;

function getActive(userId) {
  return knex('user_addresses')
      .select(['*'])
      .where(
          {
            user_id: userId,
            active: 1,
          });
}

module.exports.getActive = getActive;


// class KYCModel {
//   constructor(userId, data) {
//     if
//     (
//       !userId ||
//       !data.address_1 ||
//       !data.address_2 ||
//       !data.city ||
//       !data.state ||
//       !data.zip ||
//       !data.ssn
//     ) {
//       throw new CodeError('Input fields not defined', 404);
//     }
//     this.user_id = userId;
//     this.address_1 = data.address_1;
//     this.address_2 = data.address_2;
//     this.city = data.city;
//     this.state = data.state;
//     this.zip = String(data.zip);
//     this.ssn = String(data.ssn);
//   }
//   async finishUser() {
//     const [sqlRes] = await knex('app_users')
//         .select(['firstname', 'lastname', 'mobile', 'email'])
//         .where({user_id: this.user_id});
//     this.first_name = sqlRes.firstname;
//     this.last_name = sqlRes.lastname;
//     this.mobile = sqlRes.mobile;
//     this.email = sqlRes.email;
//   }
//   dumpUser() {
//     return {
//       'first_name': this.first_name,
//       'last_name': this.last_name,
//       'mobile': this.mobile,
//       'email': this.email,
//       'user_id': this.user_id,
//       'address': this.address_1,
//       'address_2': this.address_2,
//       'city': this.city,
//       'state': this.state,
//       'zip': this.zip,
//       'ssn': this.ssn,
//     };
//   }
// }

// class SILAModel {
//   constructor(args) {
//     this.user_id = args.user_id;
//     this.handle = args.handle;
//     this.address = args.address;
//     this.privKey = args.privKey;
//   }
//   getActive() {
//     return knex('users_public_keys')
//         .select(['*'])
//         .where(
//             {
//               user_id: this.user_id,
//               active: 1,
//             });
//   }
//   save() {
//     return knex.transaction(async (trx) => {
//       // Must double check to make sure that we
//       // there are no other entries marked as active
//       const active = await trx('users_public_keys')
//           .select(['*'])
//           .where(
//               {
//                 user_id: this.user_id,
//                 active: 1,
//               });


//       console.log('Active: ', active.length);
//       if (active.length != 0) {
//         throw new CodeError('Active account already exists', 400);
//       }
//       await trx('users_public_keys').insert({
//         'user_id': this.user_id,
//         'sila_username': this.handle,
//         'address': this.address,
//         'key_value': this.privKey,
//       });
//     });
//   }
// }


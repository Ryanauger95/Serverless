
// POST Body format validator
// const schema = Joi.object().keys({
//   address_1: Joi.string().required(),
//   address_2: Joi.string().required(),
//   city: Joi.string().required(),
//   state: Joi.string().required(),
//   zip: Joi.string().required(),
//   ssn: Joi.number().integer().required(),
// });

// Accepts the KYC information from the user.
// If the user exists, and does not have any active account,
// then we use the bank shem
// async function register(event) {
//   const response = {};
//   try {
//     console.log('Event: ', event);

//     // Parse and validate payload
//     const body = JSON.parse(event.body);
//     const {error} = schema.validate(body);
//     if (error !== null) {
//       throw Error('Validation failed with an error');
//     }

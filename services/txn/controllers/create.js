const model = require('../model/txn');
const Joi = require('joi');

// POST Body format validator
const schema = Joi.object().keys({
  amount: Joi.number().integer().required(),
  reserve: Joi.number().integer().required(),
  description: Joi.string().required(),
  holding_period: Joi.number().integer().required(),
  payer: Joi.number().integer().required(),
  collector: Joi.number().integer().required(),
  originator: Joi.number().integer().required(),
});

async function create(event) {
  let response = {};
  try {
    console.log('Event: ', event);
    const body = JSON.parse(event.body);
    // const body = event;
    const {error} = schema.validate(body);
    if (error !== null) {
      throw Error('Validation failed with an error');
    }
    const txnId = await model.save(
        body.amount, body.reserve,
        body.description, body.payer,
        body.collector, body.originator,
        body.holding_period);

    response = {
      statusCode: 200,
      body: JSON.stringify({
        message: 'success',
        txn_id: txnId,
      }),
    };
  } catch (err) {
    console.log('Error: ', err);
    response = {
      statusCode: 400,
      body: JSON.stringify({
        message: err.message,
      }),
    };
  }
  return response;
};

module.exports.create = create;

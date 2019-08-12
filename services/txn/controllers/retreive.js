const model = require('../lib/models/txn');
const Joi = require('joi');

async function retreive(event, context) {
  console.log(event);
  let response = {statusCode: 500};
  try {
    const txnId = event['pathParameters']['txn_id'];
    console.log('TXNID: ', txnId);
    const [sql] = await model.retreive(txnId);
    console.log(sql);
    response = {
      statusCode: 200,
      body: JSON.stringify({
        result: sql,
      }),
    };
  } catch (err) {
    console.log(err);
  }
  return response;
}

module.exports.retreive = retreive;

const knex = require('../handlers/mysql').knex;

const deal_state = {
  dispute: -3,
  timeout: -2,
  cancelled: -1,
  pending: 0,
  progress: 1,
  review: 2,
  finished: 3,
};
const deal_role = {
  sender: 0,
  receiver: 1,
};

function retreive(
    txnId
) {
  return knex('txn').select('*').where({txn_id: txnId});
}

function save(
    amount, reserve, description,
    payer, collector, originator, period
) {
  return knex.transaction(async (trx) => {
    const [fee_id] = await fee(trx, amount);
    console.log('fee id: ', fee_id);

    const [holding_id] = await holding_period(trx, period);
    console.log('holding id: ', holding_id.insertId);

    const [txn] = await trx('txn')
        .insert({
          'amount': amount,
          'reserve': reserve,
          'description': description,
          'payer_id': payer,
          'collector_id': collector,
          'originator_id': originator,
          'fee_id': fee_id,
          'holding_period_id': holding_id.insertId,
        });
    console.log('Txn_id: ', txn);
    return txn;
  });
}

function fee(amount) {
  return knex('fee_schedule').insert({total_fee: amount});
}
function fee(driver, amount) {
  return driver('fee_schedule').insert({total_fee: amount});
}

function holding_period(period) {
  return holding_period(knex, period);
}
function holding_period(driver, period) {
  const due_date = (Date.now() / 1000 + 60 * 60 * 24 * period) | 0;
  console.log('Due date: ', due_date);
  return driver.raw('INSERT INTO holding_period (period, due_date) \
    VALUES (:period, FROM_UNIXTIME(:due_date))', {period: period, due_date: due_date});
}

module.exports.save = save;
module.exports.retreive = retreive;

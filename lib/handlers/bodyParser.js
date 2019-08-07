const {CodeError} = require('./error');

// Parse and validate POST body
function parse(body) {
  if (typeof body === 'string') {
    body = JSON.parse(event.body);
  }
  return body;
}
function validate(data, schema) {
  const {error} = schema.validate(data);
  if (error !== null) {
    throw new CodeError('Validation failed with an error');
  }
}

function parseAndValidate(data, schema) {
  const parsedData = parse(data);
  validate(parsedData, schema);
  return parsedData;
}

module.exports = {
  parse: parse,
  validate: validate,
  parseAndValidate: parseAndValidate,
};

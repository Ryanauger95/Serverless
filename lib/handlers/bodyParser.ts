import { CodeError } from "./error";
import { ConfigurationServicePlaceholders } from "aws-sdk/lib/config_service_placeholders";

// Parse and validate POST body
function parse(data) {
  if (typeof data === "string") {
    return JSON.parse(data);
  } else {
    return data;
  }
}
function validate(data, schema) {
  if (typeof data !== "object") {
    throw new CodeError("Bad validation input data", 400);
  }
  const { error } = schema.validate(data);
  if (error !== null) {
    console.log("Validation error: ", error);
    throw new CodeError("Validation failed with an error", 400);
  }
}

function parseAndValidate(data, schema) {
  const parsedData = parse(data);
  validate(parsedData, schema);
  return parsedData;
}

export { parse, validate, parseAndValidate };

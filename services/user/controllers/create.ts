import * as Joi from "joi";
import { User } from "../lib/models/user";
import { parseAndValidate } from "../lib/handlers/bodyParser";
import { HttpResponse } from "../lib/models/httpResponse";
import * as SMS from "../lib/handlers/sms";
import * as SNS from "../lib/handlers/sns";

/**
 * Creates a user with the given first_name, last_name, email, and token
 *
 * @param {*} { body: bodyUnvalidated }
 * @returns
 */
async function create({ body: bodyUnvalidated }): Promise<HttpResponse> {
  let response = { statusCode: 400, body: null };
  try {
    // Parse and validate payload
    // Register Body Format Validator
    const schema = Joi.object().keys({
      first_name: Joi.string().required(),
      last_name: Joi.string().required(),
      email: Joi.string().required(),
      token: Joi.string().required()
    });
    const body = parseAndValidate(bodyUnvalidated, schema);
    console.log("Create user body: ", body);

    // Insert the user into the database
    const user: any = await User.query().insertAndFetch({
      first_name: body.first_name,
      last_name: body.last_name,
      email: body.email,
      token: body.token
    } as any);

    const res = await SNS.publish(
      "user-registered",
      JSON.stringify({
        user_id: user.id
      })
    );
    console.log("SNS RES: ", res);

    console.log("User: ", user);
    return new HttpResponse(200, "success", user);
  } catch (err) {
    console.log("Error: ", err);
    if (err.code === "ER_DUP_ENTRY") {
      return new HttpResponse(400, "Duplicate entry");
    } else {
      return new HttpResponse(500, "Unknown error");
    }
  }
}

export { create };

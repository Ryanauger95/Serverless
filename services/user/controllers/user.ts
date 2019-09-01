import { Txn } from "../lib/models/txn";
import { HttpResponse } from "../lib/models/httpResponse";
import { User } from "../lib/models/user";

/*
 *  GET a user
 */
async function fetch(event) {
  console.log(event);
  let response = { statusCode: 500, body: null };
  try {
    const userId = event["pathParameters"]["user_id"];
    console.log("userId: ", userId);
    const user: any = await User.query().findById(userId);
    // Don't return the password
    user.token = null;

    console.log(user);
    response = {
      statusCode: 200,
      body: JSON.stringify({
        data: user
      })
    };
  } catch (err) {
    console.log(err);
  }
  return response;
}

/**
 * Does a db lookup either for the email or
 * all info. TODO: GraphQL?
 *
 * @param {*} { queryStringParameters: query }
 * @returns
 */
async function fetchQuery({ queryStringParameters: query }) {
  var sql: any;
  try {
    console.log("typeof query: ", typeof query);
    if (query !== null && typeof query.email === "string") {
      sql = await User.query().findOne({ email: query.email });
    } else {
      sql = await User.query().select([
        "id",
        "first_name",
        "last_name",
        "profile_img_url"
      ]);
    }
    return new HttpResponse(200, "", sql);
  } catch (err) {
    console.log("Error with query: ", err);
    return new HttpResponse(500, "Error Reading DB");
  }
}

export { fetch, fetchQuery };

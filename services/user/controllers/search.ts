import { User } from "../lib/models/user";
import { HttpResponse } from "../lib/models/httpResponse";

async function search({ queryStringParameters: queryParams }) {
  console.log("queryParams: ", queryParams);
  try {
    const userQuery = queryParams.user_query;
    if (userQuery === undefined) {
      throw Error("Empty user_query");
    }
    const users: any = await User.query()
      .select(["id", "first_name", "last_name", "profile_img_url"])
      .where("email", "like", "%" + userQuery + "%")
      .orWhere("phone", "like", "%" + userQuery + "%")
      .orWhere("first_name", "like", "%" + userQuery + "%")
      .orWhere("last_name", "like", "%" + userQuery + "%");

    return new HttpResponse(200, "", { users: users });
  } catch (err) {
    console.log("Query Error: ", err);
    return new HttpResponse(400, err.message);
  }
}

export { search };

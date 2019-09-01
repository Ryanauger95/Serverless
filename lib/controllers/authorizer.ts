import { User } from "../models/user";

async function generateIAM(email: string, token: string, methodArn: string) {
  const user: any = await User.query().findOne({ email: email });
  // TODO: Dont just use . Do something quicker
  if (user.token !== token) {
    throw Error("Invalid token!");
  }
  return {
    principalId: user.id,
    policyDocument: {
      Version: "2012-10-17",
      Statement: [
        {
          Action: "execute-api:Invoke",
          Effect: "Allow",
          Resource: "*"
        }
      ]
    },
    context: {
      user_id: user.id
    }
  };
}

async function defaultAuthorizer({
  authorizationToken: authTokenStr,
  methodArn: methodArn,
  requestContext: requestContext
}) {
  console.log("authTokenStr: ", authTokenStr);
  const authToken = JSON.parse(authTokenStr);
  console.log("authToken:", authToken);
  console.log("authToken.token:", authToken["token"]);
  console.log("methodArn:", methodArn);
  console.log("requestContext:", requestContext);
  return generateIAM(authToken.email, authToken.token, methodArn);
}

export { defaultAuthorizer };

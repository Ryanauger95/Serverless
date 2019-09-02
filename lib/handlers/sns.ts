import { AWS } from "./aws";

var sns = new AWS.SNS({
  apiVersion: "2010-03-31",
  endpoint: process.env.AWS_ENDPOINT
});

const SNS_TOPIC = Object.freeze({
  USER_REGISTERED: process.env.AWS_USER_REGISTERED_TOPIC_ARN,
  USER_WALLET_REGISTERED: process.env.AWS_USER_WALLET_REGISTERED_TOPIC_ARN,
  USER_WALLET_KYC_CHANGED: process.env.AWS_USER_WALLET_KYC_CHANGED_TOPIC_ARN,
  LEDGER_ADDED: process.env.AWS_LEDGER_ADDED_TOPIC_ARN
});

function publish(Topic: string, Message: string) {
  const params = {
    Message: Message,
    TopicArn: Topic
  };
  console.log("params: ", params);
  return sns.publish(params).promise();
}

export { SNS_TOPIC, publish };

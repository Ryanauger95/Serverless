import { AWS } from "./aws";

const ARNList = Object.freeze({
  "user-registered": process.env.AWS_USER_REGISTERED_TOPIC_ARN,
  "user-wallet-registered": process.env.AWS_USER_WALLET_REGISTERED_TOPIC_ARN,
  "user-wallet-kyc_changed": process.env.AWS_USER_WALLET_KYC_CHANGED_TOPIC_ARN
});

function publish(Topic, Message) {
  const params = {
    Message: Message,
    TopicArn: ARNList[Topic]
  };
  return new AWS.SNS({ apiVersion: "2010-03-31" }).publish(params).promise();
}

module.exports.publish = publish;

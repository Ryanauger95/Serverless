import { AWS } from "./aws";

var sqs = new AWS.SQS({ apiVersion: "2012-11-05" });

enum QUEUE {
  TRANSACTION = "https://sqs.us-east-1.amazonaws.com/159043750740/sila-transactions.fifo"
}

class QueueMessage {
  constructor() {}
}

function addToQueue(queueUrl: QUEUE) {
  return sqs
    .sendMessage({
      MessageAttributes: {
        txn_id: {
          DataType: "Number",
          StringValue: "1"
        }
      } as any,
      MessageBody: "TxnId",
      QueueUrl: queueUrl
    })
    .promise();
}

export { QUEUE, addToQueue };

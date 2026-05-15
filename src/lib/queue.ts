import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

// SQSClient initialized without explicit credentials
// AWS SDK v3 will automatically use the IAM Task Role attached to the ECS container
const sqsClient = new SQSClient({ region: process.env.AWS_REGION });

export async function pushToTaskQueue(payload: any) {
  const command = new SendMessageCommand({
    QueueUrl: process.env.SQS_QUEUE_URL,
    MessageBody: JSON.stringify(payload),
  });

  const result = await sqsClient.send(command);
  if (result.MessageId) {
    console.log("SQS Message sent, MessageId:", result.MessageId);
  }

  return result;
}

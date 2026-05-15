import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

// SQSClient initialized without hardcoded credentials
// AWS SDK v3 automatically uses the IAM Task Role attached to the ECS container
const sqsClient = new SQSClient({ region: process.env.AWS_REGION });

export const sendToQueue = async (data: any) => {
  const command = new SendMessageCommand({
    QueueUrl: process.env.SQS_QUEUE_URL,
    MessageBody: JSON.stringify(data),
  });

  try {
    const result = await sqsClient.send(command);
    if (result.MessageId) {
      console.log(`[SQS] Message sent successfully. MessageId: ${result.MessageId}`);
    }
    return result;
  } catch (error) {
    console.error("SQS Error:", error);
    throw error;
  }
};

export const sendTaskToQueue = sendToQueue;
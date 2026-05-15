import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type SQSEvent = {
  Records: Array<{
    body: string;
  }>;
};

export const handler = async (event: SQSEvent) => {
  console.log("Lambda handler started, processing", event.Records.length, "records");

  try {
    for (const record of event.Records) {
      try {
        console.log("Processing record:", record.body);
        const payload = JSON.parse(record.body);
        const taskId = payload.taskId;

        if (!taskId) {
          console.error("No taskId found in payload:", payload);
          continue;
        }

        console.log("Updating task", taskId, "to PROCESSING");
        await prisma.execution.update({
          where: { id: taskId },
          data: { status: "RUNNING" },
        });

        console.log("Successfully updated task", taskId);
      } catch (error) {
        console.error("Error processing record:", error);
      }
    }
  } finally {
    await prisma.$disconnect();
    console.log("Lambda handler completed, database connection closed");
  }
};

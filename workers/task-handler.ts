import { PrismaClient } from "../src/generated/prisma";
import Cryptr from "cryptr";

const prisma = new PrismaClient();
const cryptr = new Cryptr(process.env.ENCRYPTION_KEY || "build_placeholder");

type SQSEvent = {
  Records: Array<{
    body: string;
  }>;
};

async function executeGeminiNode(node: any, variables: Record<string, any>) {
  const credential = node.credential;
  if (!credential) throw new Error("No credential found for Gemini node");

  const apiKey = cryptr.decrypt(credential.value);
  const data = node.data as any;

  const userPrompt = resolveTemplate(data.userPrompt || "Say hello!", variables);
  const systemPrompt = data.systemPrompt || "You are a helpful assistant.";
  const model = data.model || "gemini-2.0-flash";

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userPrompt }] }],
      }),
    }
  );

  const result = await response.json();
  if (!response.ok) throw new Error(`Gemini error: ${JSON.stringify(result)}`);

  const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const variableName = data.variableName || "myGemini";
  return { variableName, text };
}

async function executeDiscordNode(node: any, variables: Record<string, any>) {
  const data = node.data as any;
  const webhookUrl = data.webhookUrl;
  if (!webhookUrl) throw new Error("No webhook URL found for Discord node");

  const messageContent = resolveTemplate(data.messageContent || "", variables);
  const username = data.botUsername || "Workflow Bot";

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: messageContent, username }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Discord error: ${text}`);
  }

  return { success: true };
}

function resolveTemplate(template: string, variables: Record<string, any>): string {
  return template.replace(/\{\{(\w+)\.(\w+)\}\}/g, (_, varName, prop) => {
    return variables[varName]?.[prop] ?? "";
  });
}

export const handler = async (event: SQSEvent) => {
  console.log("Lambda handler started, processing", event.Records.length, "records");

  try {
    for (const record of event.Records) {
      try {
        const payload = JSON.parse(record.body);
        const { workflowId } = payload;

        if (!workflowId) {
          console.error("No workflowId in payload:", payload);
          continue;
        }

        console.log("Executing workflow:", workflowId);

        // Create execution record
        const execution = await prisma.execution.create({
          data: {
            workflowId,
            status: "RUNNING",
            startedAt: new Date(),
          },
        });

        try {
          // Fetch workflow with nodes and connections
          const workflow = await prisma.workflow.findUniqueOrThrow({
            where: { id: workflowId },
            include: {
              nodes: { include: { credential: true } },
              connections: true,
            },
          });

          // Build execution order (topological sort)
          const nodeMap = new Map(workflow.nodes.map((n) => [n.id, n]));
          const incomingEdges = new Map<string, number>();
          workflow.nodes.forEach((n) => incomingEdges.set(n.id, 0));
          workflow.connections.forEach((c) => {
            incomingEdges.set(c.toNodeId, (incomingEdges.get(c.toNodeId) || 0) + 1);
          });

          const queue = workflow.nodes
            .filter((n) => (incomingEdges.get(n.id) || 0) === 0)
            .map((n) => n.id);

          const orderedNodes: string[] = [];
          while (queue.length > 0) {
            const nodeId = queue.shift()!;
            orderedNodes.push(nodeId);
            workflow.connections
              .filter((c) => c.fromNodeId === nodeId)
              .forEach((c) => {
                const count = (incomingEdges.get(c.toNodeId) || 0) - 1;
                incomingEdges.set(c.toNodeId, count);
                if (count === 0) queue.push(c.toNodeId);
              });
          }

          // Execute nodes in order
          const variables: Record<string, any> = {};

          for (const nodeId of orderedNodes) {
            const node = nodeMap.get(nodeId)!;
            console.log("Executing node:", node.type, nodeId);

            if (node.type === "INITIAL" || node.type === "MANUAL_TRIGGER") {
              continue; // skip trigger nodes
            } else if (node.type === "GEMINI") {
              const result = await executeGeminiNode(node, variables);
              variables[result.variableName] = { text: result.text };
              console.log("Gemini result:", result.text);
            } else if (node.type === "DISCORD") {
              await executeDiscordNode(node, variables);
              console.log("Discord message sent!");
            } else {
              console.log("Skipping unsupported node type:", node.type);
            }
          }

          // Mark execution as SUCCESS
          await prisma.execution.update({
            where: { id: execution.id },
            data: {
              status: "SUCCESS",
              completedAt: new Date(),
              output: variables,
            },
          });

          console.log("Workflow executed successfully!");

        } catch (error: any) {
          console.error("Workflow execution error:", error);
          await prisma.execution.update({
            where: { id: execution.id },
            data: {
              status: "FAILED",
              completedAt: new Date(),
              error: error.message,
              errorStack: error.stack,
            },
          });
        }

      } catch (error) {
        console.error("Error processing record:", error);
      }
    }
  } finally {
    await prisma.$disconnect();
    console.log("Lambda handler completed");
  }
};

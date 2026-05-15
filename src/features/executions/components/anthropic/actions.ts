"use server";

import { sendToQueue } from "@/lib/sqs";
import { anthropicChannel } from "@/lib/inngest-stubs";

export type AnthropicToken = any;

export async function fetchAnthropicRealtimeToken(): Promise<AnthropicToken> {
  await sendToQueue({ type: "fetchRealtimeToken" });
  return {} as any;
};

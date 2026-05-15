"use server";

import { sendToQueue } from "@/lib/sqs";
import { openAiChannel } from "@/lib/inngest-stubs";

export type OpenAiToken = any;

export async function fetchOpenAiRealtimeToken(): Promise<OpenAiToken> {
  await sendToQueue({ type: "fetchRealtimeToken" });
  return {} as any;
};

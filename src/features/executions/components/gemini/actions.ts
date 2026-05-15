"use server";

import { sendToQueue } from "@/lib/sqs";
import { geminiChannel } from "@/lib/inngest-stubs";

export type GeminiToken = any;

export async function fetchGeminiRealtimeToken(): Promise<GeminiToken> {
  await sendToQueue({ type: "fetchRealtimeToken" });
  return {} as any;
};

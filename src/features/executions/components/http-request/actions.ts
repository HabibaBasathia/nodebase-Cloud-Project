"use server";

import { sendToQueue } from "@/lib/sqs";
import { httpRequestChannel } from "@/lib/inngest-stubs";

export type HttpRequestToken = any;

export async function fetchHttpRequestRealtimeToken(): Promise<HttpRequestToken> {
  await sendToQueue({ type: "fetchRealtimeToken" });
  return {} as any;
};

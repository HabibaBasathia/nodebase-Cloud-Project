"use server";

import { sendToQueue } from "@/lib/sqs";
import { slackChannel } from "@/lib/inngest-stubs";

export type SlackToken = any;

export async function fetchSlackRealtimeToken(): Promise<SlackToken> {
  await sendToQueue({ type: "fetchRealtimeToken" });
  return {} as any;
};

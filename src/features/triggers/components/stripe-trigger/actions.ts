"use server";

import { sendToQueue } from "@/lib/sqs";
import { stripeTriggerChannel } from "@/lib/inngest-stubs";

export type StripeTriggerToken = any;

export async function fetchStripeTriggerRealtimeToken(): Promise<StripeTriggerToken> {
  await sendToQueue({ type: "fetchRealtimeToken" });
  return {} as any;
};

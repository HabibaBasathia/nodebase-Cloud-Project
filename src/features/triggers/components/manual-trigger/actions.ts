"use server";

import { sendToQueue } from "@/lib/sqs";
import { manualTriggerChannel } from "@/lib/inngest-stubs";

export type ManualTriggerToken = any;

export async function fetchManualTriggerRealtimeToken(): Promise<ManualTriggerToken> {
  await sendToQueue({ type: "fetchRealtimeToken" });
  return {} as any;
};

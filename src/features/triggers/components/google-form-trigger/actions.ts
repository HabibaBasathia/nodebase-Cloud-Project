"use server";

import { sendToQueue } from "@/lib/sqs";
import { googleFormTriggerChannel } from "@/lib/inngest-stubs";

export type GoogleFormTriggerToken = any;

export async function fetchGoogleFormTriggerRealtimeToken(): Promise<GoogleFormTriggerToken> {
  await sendToQueue({ type: "fetchRealtimeToken" });
  return {} as any;
};

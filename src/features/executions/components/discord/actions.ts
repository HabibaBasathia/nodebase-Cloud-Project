"use server";

import { sendToQueue } from "@/lib/sqs";
import { discordChannel } from "@/lib/inngest-stubs";

export type DiscordToken = any;

export async function fetchDiscordRealtimeToken(): Promise<DiscordToken> {
  await sendToQueue({ type: "fetchRealtimeToken" });
  return {} as any;
};

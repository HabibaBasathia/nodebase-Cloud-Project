type ChannelStatusPayload = {
  nodeId: string;
  status: "initial" | "loading" | "success" | "error";
};

type Channel = {
  name: string;
  status: (payload: ChannelStatusPayload) => { channel: string } & ChannelStatusPayload;
};

const createChannel = (name: string): Channel => ({
  name,
  status: (payload) => ({ channel: name, ...payload }),
});

export const STRIPE_TRIGGER_CHANNEL_NAME = "stripe-trigger";
export const MANUAL_TRIGGER_CHANNEL_NAME = "manual-trigger";
export const GOOGLE_FORM_TRIGGER_CHANNEL_NAME = "google-form-trigger";
export const SLACK_CHANNEL_NAME = "slack";
export const DISCORD_CHANNEL_NAME = "discord";
export const OPENAI_CHANNEL_NAME = "openai";
export const ANTHROPIC_CHANNEL_NAME = "anthropic";
export const GEMINI_CHANNEL_NAME = "gemini";
export const HTTP_REQUEST_CHANNEL_NAME = "http-request";

export const stripeTriggerChannel = () => createChannel(STRIPE_TRIGGER_CHANNEL_NAME);
export const manualTriggerChannel = () => createChannel(MANUAL_TRIGGER_CHANNEL_NAME);
export const googleFormTriggerChannel = () => createChannel(GOOGLE_FORM_TRIGGER_CHANNEL_NAME);
export const slackChannel = () => createChannel(SLACK_CHANNEL_NAME);
export const discordChannel = () => createChannel(DISCORD_CHANNEL_NAME);
export const openAiChannel = () => createChannel(OPENAI_CHANNEL_NAME);
export const anthropicChannel = () => createChannel(ANTHROPIC_CHANNEL_NAME);
export const geminiChannel = () => createChannel(GEMINI_CHANNEL_NAME);
export const httpRequestChannel = () => createChannel(HTTP_REQUEST_CHANNEL_NAME);

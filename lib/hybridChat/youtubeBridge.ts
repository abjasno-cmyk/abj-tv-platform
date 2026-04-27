import { type ChannelType } from "@/lib/hybridChat/types";

function resolveBridgeEndpoint(channelType: ChannelType): string {
  if (channelType === "OWNED_ABJ") {
    return process.env.YT_BRIDGE_BOT1_ENDPOINT ?? "";
  }
  return process.env.YT_BRIDGE_BOT2_ENDPOINT ?? "";
}

function resolveBridgeToken(channelType: ChannelType): string {
  if (channelType === "OWNED_ABJ") {
    return process.env.YT_BRIDGE_BOT1_TOKEN ?? "";
  }
  return process.env.YT_BRIDGE_BOT2_TOKEN ?? "";
}

export async function sendQuestionToYoutubeBridge(params: {
  channelType: ChannelType;
  streamId: string;
  messageId: string;
  userName: string;
  content: string;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const endpoint = resolveBridgeEndpoint(params.channelType);
  const token = resolveBridgeToken(params.channelType);

  if (!endpoint) {
    return { ok: false, reason: "Missing bridge endpoint for selected channel type." };
  }

  const text =
    params.channelType === "OWNED_ABJ"
      ? `${params.userName} (VIP ABJ): ${params.content}`
      : `${params.userName}: ${params.content}`;

  const payload = {
    streamId: params.streamId,
    messageId: params.messageId,
    text,
  };

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    if (!response.ok) {
      const details = await response.text();
      return { ok: false, reason: `Bridge API returned ${response.status}: ${details}` };
    }

    return { ok: true };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown bridge error.";
    return { ok: false, reason };
  }
}

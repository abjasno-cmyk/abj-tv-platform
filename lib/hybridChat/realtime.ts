import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { HybridChatEvent, HybridChatEventType } from "@/lib/hybridChat/types";

type BroadcastEnvelope = {
  streamId: string;
  type: HybridChatEventType | "moderation-question-updated";
  payload: unknown;
  timestamp: string;
};

function resolveBroadcastChannel(streamId: string): string {
  return `hybrid-chat:${streamId}`;
}

export async function emitHybridChatEvent(type: HybridChatEventType, event: HybridChatEvent): Promise<void> {
  const channel = resolveBroadcastChannel(event.streamId);
  const supabase = await createSupabaseServerClient();
  const envelope: BroadcastEnvelope = {
    streamId: event.streamId,
    type,
    payload: event,
    timestamp: new Date().toISOString(),
  };
  await supabase.channel(channel).send({
    type: "broadcast",
    event: "chat-event",
    payload: envelope,
  });
}

export async function emitModerationEvent(eventName: string, payload: Record<string, unknown>): Promise<void> {
  const streamId = typeof payload.streamId === "string" ? payload.streamId : undefined;
  if (!streamId) return;
  const supabase = await createSupabaseServerClient();
  await supabase.channel(resolveBroadcastChannel(streamId)).send({
    type: "broadcast",
    event: eventName,
    payload: {
      ...payload,
      emittedAt: new Date().toISOString(),
    },
  });
}

export async function emitModerationQuestionUpdated(streamId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.channel(resolveBroadcastChannel(streamId)).send({
    type: "broadcast",
    event: "moderation-question-updated",
    payload: {
      streamId,
      emittedAt: new Date().toISOString(),
    },
  });
}

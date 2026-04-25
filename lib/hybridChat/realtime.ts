import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { HybridChatEvent, HybridChatEventType, HybridMessage } from "@/lib/hybridChat/types";

type BroadcastEnvelope = {
  streamId: string;
  type: HybridChatEventType | "moderation-question-updated";
  payload: unknown;
  timestamp: string;
};

function resolveBroadcastChannel(streamId: string): string {
  return `hybrid-chat:${streamId}`;
}

export function toMessagePayload(message: {
  id: string;
  stream_id: string;
  user_id: string;
  content: string;
  type: "CHAT" | "QUESTION";
  parent_id: string | null;
  status: "PENDING" | "ANSWERED" | "SENT_TO_YT";
  createdAt: Date;
  updatedAt: Date;
}): HybridMessage {
  return {
    id: message.id,
    streamId: message.stream_id,
    userId: message.user_id,
    content: message.content,
    type: message.type,
    parentId: message.parent_id,
    status: message.status,
    createdAt: message.createdAt.toISOString(),
    updatedAt: message.updatedAt.toISOString(),
    likeCount: 0,
    upvoteCount: 0,
  };
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

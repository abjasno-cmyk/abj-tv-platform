import type { Message, MessageType, MessageStatus } from "@prisma/client";

export type ChannelType = "OWNED_ABJ" | "EXTERNAL";

export type HybridChatEventName =
  | "message-created"
  | "message-liked"
  | "question-upvoted"
  | "question-answered"
  | "question-sent-to-overlay"
  | "question-sent-to-youtube";

export type HybridChatEventPayload = {
  streamId: string;
  event: HybridChatEventName;
  emittedAt: string;
  data: Record<string, unknown>;
};

export type HybridMessage = {
  id: string;
  userId: string;
  streamId: string;
  content: string;
  type: MessageType;
  parentId: string | null;
  status: MessageStatus;
  createdAt: string;
  likeCount: number;
  upvoteCount: number;
};

export function toHybridMessage(
  message: Message & { _count?: { likes?: number; upvotes?: number } }
): HybridMessage {
  return {
    id: message.id,
    userId: message.user_id,
    streamId: message.stream_id,
    content: message.content,
    type: message.type,
    parentId: message.parent_id,
    status: message.status,
    createdAt: message.created_at.toISOString(),
    likeCount: message._count?.likes ?? 0,
    upvoteCount: message._count?.upvotes ?? 0,
  };
}

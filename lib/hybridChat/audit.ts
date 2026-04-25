import { prisma } from "@/lib/prisma";

export type ModerationActionType = "ANSWERED" | "SENT_TO_OVERLAY" | "SENT_TO_YT";

export async function writeModerationAudit(params: {
  messageId: string;
  streamId: string;
  actorUserId: string;
  action: ModerationActionType;
  payload?: Record<string, unknown>;
}) {
  await prisma.moderationAudit.create({
    data: {
      message_id: params.messageId,
      stream_id: params.streamId,
      actor_user_id: params.actorUserId,
      action: params.action,
      payload_json: params.payload ? JSON.stringify(params.payload) : null,
    },
  });
}

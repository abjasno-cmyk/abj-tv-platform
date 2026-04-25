import { prisma } from "@/lib/prisma";
import { ensureModeratorUserId } from "@/lib/hybridChat/session";
import { emitModerationEvent } from "@/lib/hybridChat/realtime";

type RouteContext = {
  params: Promise<{ messageId: string }> | { messageId: string };
};

export async function POST(_: Request, context: RouteContext) {
  const userId = await ensureModeratorUserId();
  if (!userId) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const resolved = await Promise.resolve(context.params);
  const messageId = resolved.messageId;
  if (!messageId) {
    return Response.json({ error: "Missing messageId parameter." }, { status: 400 });
  }

  const updated = await prisma.message.update({
    where: { id: messageId },
    data: { status: "ANSWERED" },
    include: {
      upvotes: true,
      likes: true,
    },
  });

  emitModerationEvent("question_answered", {
    id: updated.id,
    stream_id: updated.stream_id,
    content: updated.content,
    status: updated.status,
    upvotes_count: updated.upvotes.length,
    actor_user_id: userId,
  });

  return Response.json({
    id: updated.id,
    status: updated.status,
  });
}

import { prisma } from "@/lib/prisma";
import { getSessionUser, ensureModerationAccess } from "@/lib/hybridChat/session";
import { emitModerationEvent } from "@/lib/hybridChat/realtime";

type RouteContext = {
  params: Promise<{ messageId: string }> | { messageId: string };
};

export async function POST(_: Request, context: RouteContext) {
  const user = await getSessionUser();
  const auth = ensureModerationAccess(user);
  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }
  const actorUserId = user?.id ?? "unknown";

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

  await emitModerationEvent("question_answered", {
    id: updated.id,
    streamId: updated.stream_id,
    content: updated.content,
    status: updated.status,
    upvotesCount: updated.upvotes.length,
    actorUserId,
  });

  return Response.json({
    id: updated.id,
    status: updated.status,
  });
}

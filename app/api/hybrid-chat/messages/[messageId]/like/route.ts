import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/hybridChat/session";
import { canLikeMessage } from "@/lib/hybridChat/types";
import { emitHybridChatEvent } from "@/lib/hybridChat/realtime";

type RouteContext = {
  params: Promise<{ messageId?: string }> | { messageId?: string };
};

async function resolveMessageId(context: RouteContext): Promise<string | null> {
  const resolved = await Promise.resolve(context.params);
  const id = resolved.messageId?.trim();
  return id && id.length > 0 ? id : null;
}

export async function POST(_request: Request, context: RouteContext) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const messageId = await resolveMessageId(context);
  if (!messageId) {
    return Response.json({ error: "messageId is required" }, { status: 400 });
  }

  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: { _count: { select: { likes: true, upvotes: true } } },
  });

  if (!message) {
    return Response.json({ error: "Message not found" }, { status: 404 });
  }
  if (!canLikeMessage(message.type)) {
    return Response.json({ error: "Likes are allowed only on CHAT messages." }, { status: 400 });
  }

  try {
    await prisma.like.create({
      data: {
        user_id: sessionUser.id,
        message_id: message.id,
      },
    });

    const refreshed = await prisma.message.findUnique({
      where: {
        id: message.id,
      },
      include: { _count: { select: { likes: true, upvotes: true } } },
    });
    if (!refreshed) {
      return Response.json({ error: "Message not found" }, { status: 404 });
    }

    await emitHybridChatEvent("message-liked", {
      streamId: refreshed.stream_id,
      messageId: refreshed.id,
      likeCount: refreshed._count.likes,
    });

    return Response.json({
      ok: true,
      liked: true,
      likeCount: refreshed._count.likes,
    });
  } catch (error) {
    const asAny = error as { code?: string } | undefined;
    if (asAny?.code === "P2002") {
      return Response.json({ error: "You already liked this message." }, { status: 409 });
    }
    console.error("hybrid-chat-like-post-failed", error);
    return Response.json({ error: "Failed to set like." }, { status: 500 });
  }
}

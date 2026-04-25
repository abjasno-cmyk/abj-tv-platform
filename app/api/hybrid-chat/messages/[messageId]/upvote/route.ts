import { prisma } from "@/lib/prisma";
import { getSessionUserOrThrow } from "@/lib/hybridChat/session";
import { emitHybridChatEvent } from "@/lib/hybridChat/realtime";
import { messageIncludeWithCounts, toHybridMessage } from "@/lib/hybridChat/types";

type RouteContext = {
  params: Promise<{ messageId: string }> | { messageId: string };
};

export const dynamic = "force-dynamic";

export async function POST(_request: Request, context: RouteContext) {
  let sessionUserId: string;
  try {
    sessionUserId = await getSessionUserOrThrow();
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { messageId } = await Promise.resolve(context.params);
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: messageIncludeWithCounts,
  });

  if (!message) {
    return Response.json({ error: "Message not found" }, { status: 404 });
  }

  if (message.type !== "QUESTION") {
    return Response.json({ error: "Only QUESTION messages can be upvoted" }, { status: 400 });
  }

  if (message.user_id === sessionUserId) {
    return Response.json({ error: "You cannot upvote your own question" }, { status: 400 });
  }

  try {
    await prisma.upvote.create({
      data: {
        message_id: messageId,
        user_id: sessionUserId,
      },
    });
  } catch {
    // Likely unique constraint hit -> idempotent response below.
  }

  const refreshed = await prisma.message.findUnique({
    where: { id: messageId },
    include: messageIncludeWithCounts,
  });

  if (!refreshed) {
    return Response.json({ error: "Message not found" }, { status: 404 });
  }

  const payload = toHybridMessage(refreshed);
  await emitHybridChatEvent("question-upvoted", {
    messageId: payload.id,
    streamId: payload.streamId,
    upvoteCount: payload.upvoteCount,
  });

  return Response.json({ message: payload });
}

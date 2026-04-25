import { prisma } from "@/lib/prisma";
import { sendQuestionToYoutubeBridge } from "@/lib/hybridChat/youtubeBridge";
import { assertModerator } from "@/lib/hybridChat/session";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ messageId: string }> | { messageId: string };
};

export async function POST(_request: Request, context: RouteContext) {
  let actor;
  try {
    actor = await assertModerator();
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNAUTHORIZED";
    if (message === "FORBIDDEN") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const actorUserId = actor?.id ?? "unknown";

  const resolved = await Promise.resolve(context.params);
  const messageId = resolved.messageId;
  if (!messageId) {
    return Response.json({ error: "Missing messageId" }, { status: 400 });
  }

  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: {
      stream: true,
    },
  });

  if (!message || message.type !== "QUESTION") {
    return Response.json({ error: "Question not found" }, { status: 404 });
  }
  if (message.status === "SENT_TO_YT") {
    return Response.json({ ok: true, status: "SENT_TO_YT", duplicate: true });
  }

  const bridgeResult = await sendQuestionToYoutubeBridge({
    channelType: message.stream.channel_type,
    streamId: message.stream_id,
    messageId: message.id,
    userName: actor?.name ?? actor?.email ?? "ABJ User",
    content: message.content,
  });
  if (!bridgeResult.ok) {
    return Response.json({ error: bridgeResult.reason }, { status: 502 });
  }

  const updated = await prisma.message.update({
    where: { id: message.id },
    data: { status: "SENT_TO_YT" },
    select: { id: true, status: true, stream_id: true, content: true },
  });

  await prisma.moderationAction.create({
    data: {
      message_id: message.id,
      stream_id: message.stream_id,
      actor_user_id: actorUserId,
      action: "SEND_TO_YOUTUBE",
      payload: {
        channelType: message.stream.channel_type,
        endpointHint: message.stream.channel_type === "OWNED_ABJ" ? "BOT1" : "BOT2",
      },
    },
  });

  await import("@/lib/hybridChat/realtime").then(({ emitModerationEvent }) =>
    emitModerationEvent("question.sent_to_youtube", {
      id: updated.id,
      streamId: updated.stream_id,
      content: updated.content,
      status: updated.status,
      actorUserId,
      sentAt: new Date().toISOString(),
    })
  );

  return Response.json({
    ok: true,
    status: "SENT_TO_YT",
  });
}

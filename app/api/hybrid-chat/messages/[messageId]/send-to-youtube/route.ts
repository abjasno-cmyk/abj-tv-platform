import { prisma } from "@/lib/prisma";
import { sendQuestionToYoutubeBridge } from "@/lib/hybridChat/youtubeBridge";
import { ensureModerationAccess, getSessionUser } from "@/lib/hybridChat/session";
import { writeModerationAudit } from "@/lib/hybridChat/audit";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ messageId: string }> | { messageId: string };
};

export async function POST(_request: Request, context: RouteContext) {
  const actor = await getSessionUser();
  const moderationCheck = ensureModerationAccess(actor);
  if (!moderationCheck.ok) {
    return Response.json({ error: moderationCheck.error }, { status: moderationCheck.status });
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

  await writeModerationAudit({
    messageId: message.id,
    streamId: message.stream_id,
    actorUserId,
    action: "SENT_TO_YT",
    payload: {
      channelType: message.stream.channel_type,
      endpointHint: message.stream.channel_type === "OWNED_ABJ" ? "BOT1" : "BOT2",
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

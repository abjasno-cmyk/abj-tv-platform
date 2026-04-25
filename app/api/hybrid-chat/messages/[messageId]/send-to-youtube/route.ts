import { prisma } from "@/lib/prisma";
import { sendQuestionToYoutubeBridge } from "@/lib/hybridChat/youtubeBridge";
import { ensureModerator, getSessionUser } from "@/lib/hybridChat/session";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ messageId: string }> | { messageId: string };
};

export async function POST(_request: Request, context: RouteContext) {
  const actor = await getSessionUser();
  const moderationCheck = ensureModerator(actor);
  if (!moderationCheck.ok) {
    return Response.json({ error: moderationCheck.error }, { status: moderationCheck.status });
  }

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

  const bridgeResult = await sendQuestionToYoutubeBridge({
    channelType: message.stream.channel_type,
    streamId: message.stream_id,
    messageId: message.id,
    userName: actor.name,
    content: message.content,
  });
  if (!bridgeResult.ok) {
    return Response.json({ error: bridgeResult.reason }, { status: 502 });
  }

  await prisma.message.update({
    where: { id: message.id },
    data: {
      status: "SENT_TO_YT",
    },
  });

  return Response.json({
    ok: true,
    status: "SENT_TO_YT",
  });
}

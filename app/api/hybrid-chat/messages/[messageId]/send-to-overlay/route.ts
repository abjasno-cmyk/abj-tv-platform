import { requireSessionUser } from "@/lib/hybridChat/session";
import { emitModerationEvent } from "@/lib/hybridChat/realtime";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ messageId: string }> | { messageId: string };
};

export async function POST(_: Request, context: RouteContext) {
  const user = await requireSessionUser();
  if (!user) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { messageId } = await Promise.resolve(context.params);
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: {
      stream: true,
    },
  });
  if (!message) {
    return Response.json({ error: "Message not found." }, { status: 404 });
  }
  if (message.type !== "QUESTION") {
    return Response.json({ error: "Only QUESTION messages can be sent to overlay." }, { status: 400 });
  }

  await emitModerationEvent("question.sent_to_overlay", {
    id: message.id,
    content: message.content,
    streamId: message.stream_id,
    channelType: message.stream.channel_type,
    userId: message.user_id,
    sentAt: new Date().toISOString(),
  });

  return Response.json({ ok: true });
}

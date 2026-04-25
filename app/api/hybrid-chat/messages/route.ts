import { prisma } from "@/lib/prisma";
import { requireSessionUserId } from "@/lib/hybridChat/session";
import { toHybridMessage } from "@/lib/hybridChat/types";
import { emitHybridChatEvent } from "@/lib/hybridChat/realtime";

export const dynamic = "force-dynamic";

type CreateMessageBody = {
  stream_id?: string;
  content?: string;
  type?: "CHAT" | "QUESTION";
  parent_id?: string | null;
};

type MessageListRow = {
  id: string;
  stream_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  type: "CHAT" | "QUESTION";
  status: "PENDING" | "ANSWERED" | "SENT_TO_YT";
  created_at: Date;
  _count: {
    likes: number;
    upvotes: number;
  };
};

type ActiveStreamSummary = {
  id: string;
};

function normalizeContent(content: string): string {
  return content.trim().replace(/\s+/g, " ");
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requestedStreamId = searchParams.get("stream_id");
  const type = searchParams.get("type");

  if (type !== "CHAT" && type !== "QUESTION") {
    return Response.json({ error: "Query parameter type must be CHAT or QUESTION." }, { status: 400 });
  }

  let streamId = requestedStreamId;
  if (!streamId) {
    const activeStream = (await prisma.stream.findFirst({
      where: { is_active: true },
      select: { id: true },
      orderBy: { updated_at: "desc" },
    })) as ActiveStreamSummary | null;
    streamId = activeStream?.id ?? null;
  }
  if (!streamId) {
    return Response.json({ error: "No active stream found." }, { status: 404 });
  }

  const orderBy =
    type === "QUESTION"
      ? [{ upvotes: { _count: "desc" as const } }, { created_at: "desc" as const }]
      : [{ created_at: "desc" as const }];

  const messages = (await prisma.message.findMany({
    where: {
      stream_id: streamId,
      type,
    },
    orderBy,
    include: {
      likes: { select: { user_id: true } },
      upvotes: { select: { user_id: true } },
      _count: { select: { likes: true, upvotes: true } },
    },
    take: 200,
  })) as MessageListRow[];

  return Response.json({
    items: messages.map((message) => ({
      id: message.id,
      stream_id: message.stream_id,
      user_id: message.user_id,
      parent_id: message.parent_id,
      content: message.content,
      type: message.type,
      status: message.status,
      created_at: message.created_at.toISOString(),
      likes_count: message._count.likes,
      upvotes_count: message._count.upvotes,
    })),
  });
}

export async function POST(request: Request) {
  const userId = await requireSessionUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as CreateMessageBody;
  const streamId = body.stream_id?.trim();
  const content = body.content ? normalizeContent(body.content) : "";
  const type = body.type;
  const parentId = body.parent_id ?? null;

  if (!streamId) {
    return Response.json({ error: "Missing stream_id." }, { status: 400 });
  }
  if (!content) {
    return Response.json({ error: "Message content is required." }, { status: 400 });
  }
  if (content.length > 1000) {
    return Response.json({ error: "Message content is too long (max 1000)." }, { status: 400 });
  }
  if (type !== "CHAT" && type !== "QUESTION") {
    return Response.json({ error: "Invalid message type." }, { status: 400 });
  }

  const stream = await prisma.stream.findUnique({
    where: { id: streamId },
    select: { id: true, is_active: true },
  });
  if (!stream) {
    return Response.json({ error: "Stream not found." }, { status: 404 });
  }
  if (!stream.is_active) {
    return Response.json({ error: "Cannot post to inactive stream." }, { status: 400 });
  }

  if (parentId) {
    const parent = await prisma.message.findUnique({
      where: { id: parentId },
      select: { id: true, stream_id: true, type: true },
    });
    if (!parent) {
      return Response.json({ error: "Parent message not found." }, { status: 404 });
    }
    if (parent.stream_id !== streamId) {
      return Response.json({ error: "Parent message belongs to another stream." }, { status: 400 });
    }
    if (parent.type !== "CHAT" || type !== "CHAT") {
      return Response.json(
        { error: "Threaded replies are only available for chat messages." },
        { status: 400 }
      );
    }
  }

  const created = await prisma.message.create({
    data: {
      stream_id: streamId,
      user_id: userId,
      content,
      type,
      parent_id: parentId,
    },
  });

  const payload = toHybridMessage(created);
  await emitHybridChatEvent("message-created", {
    streamId,
    message: payload,
  });

  return Response.json(
    {
      item: payload,
    },
    { status: 201 }
  );
}

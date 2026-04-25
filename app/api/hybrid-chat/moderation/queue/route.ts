import { prisma } from "@/lib/prisma";
import { ensureModerationAccess, getSessionUser } from "@/lib/hybridChat/session";

export const dynamic = "force-dynamic";

type QueueRow = {
  id: string;
  stream_id: string;
  user_id: string;
  content: string;
  status: "PENDING" | "ANSWERED" | "SENT_TO_YT";
  created_at: Date;
  _count: {
    upvotes: number;
  };
};

export async function GET() {
  const user = await getSessionUser();
  const auth = ensureModerationAccess(user);
  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  const stream = await prisma.stream.findFirst({
    where: { is_active: true },
    orderBy: { updated_at: "desc" },
    select: { id: true, title: true, channel_type: true },
  });
  if (!stream) {
    return Response.json({ error: "No active stream found." }, { status: 404 });
  }

  const questions = (await prisma.message.findMany({
    where: {
      stream_id: stream.id,
      type: "QUESTION",
      status: "PENDING",
    },
    orderBy: [{ upvotes: { _count: "desc" } }, { created_at: "desc" }],
    include: {
      _count: {
        select: { upvotes: true },
      },
    },
    take: 250,
  })) as QueueRow[];

  return Response.json({
    stream,
    items: questions.map((item) => ({
      id: item.id,
      stream_id: item.stream_id,
      user_id: item.user_id,
      content: item.content,
      status: item.status,
      created_at: item.created_at.toISOString(),
      upvotes_count: item._count.upvotes,
    })),
  });
}

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const stream = await prisma.stream.findFirst({
      where: { is_active: true },
      orderBy: { updated_at: "desc" },
    });

    if (!stream) {
      return Response.json({ error: "No active stream found." }, { status: 404 });
    }

    return Response.json({ stream });
  } catch (error) {
    console.error("hybrid-chat-active-stream-get-failed", error);
    return Response.json({ error: "Unable to resolve active stream." }, { status: 500 });
  }
}

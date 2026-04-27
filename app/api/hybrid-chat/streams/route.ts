import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const streams = await prisma.stream.findMany({
      orderBy: [{ is_active: "desc" }, { updated_at: "desc" }],
    });
    return Response.json({ streams });
  } catch (error) {
    console.error("hybrid-chat-streams-get-failed", error);
    return Response.json({ error: "Nelze načíst streamy." }, { status: 500 });
  }
}

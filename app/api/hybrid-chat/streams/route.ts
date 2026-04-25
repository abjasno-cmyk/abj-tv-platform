import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/hybridChat/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const streams = await prisma.stream.findMany({
      orderBy: [{ is_active: "desc" }, { updated_at: "desc" }],
    });
    return jsonOk({ streams });
  } catch (error) {
    console.error("hybrid-chat-streams-get-failed", error);
    return jsonError("Nelze načíst streamy.", 500);
  }
}

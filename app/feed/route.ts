import { loadStructuredFeedPayload } from "@/lib/dayOverview";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const payload = await loadStructuredFeedPayload();
    return Response.json(payload);
  } catch (error) {
    console.error("feed-route failed", error);
    return Response.json(
      {
        top: [],
        topics: {},
        channels: {},
        error: error instanceof Error ? error.message : "Unknown feed route error",
      },
      { status: 500 }
    );
  }
}

import { getProgram } from "@/lib/programEngine";
import { pickLiveAlertBlock, toLiveAlertCandidate, type LiveAlertCandidate } from "@/lib/liveAlert";

export const dynamic = "force-dynamic";

type LiveNowPayload = {
  is_live: boolean;
  items: LiveAlertCandidate[];
};

export async function GET() {
  const fallback: LiveNowPayload = {
    is_live: false,
    items: [],
  };

  try {
    const now = new Date();
    const timeline = await getProgram();
    const block = pickLiveAlertBlock(timeline, now);
    if (!block?.videoId) return Response.json(fallback);

    return Response.json({
      is_live: true,
      items: [toLiveAlertCandidate(block)],
    } satisfies LiveNowPayload);
  } catch {
    return Response.json(fallback);
  }
}

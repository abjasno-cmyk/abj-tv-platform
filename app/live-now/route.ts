import { getProgram } from "@/lib/programEngine";
import type { ProgramBlock } from "@/lib/epg-types";

export const dynamic = "force-dynamic";

type LiveNowPayload = {
  is_live: boolean;
  video_id: string | null;
  title: string | null;
  channel: string | null;
  thumbnail: string | null;
  is_premiere: boolean;
  started_at: string | null;
};

function pickActiveLiveBlock(timeline: ProgramBlock[], now: Date): ProgramBlock | null {
  const nowTs = now.getTime();
  const active = timeline
    .filter((block) => {
      if (!block.videoId) return false;
      if (block.type !== "live" && block.type !== "premiere") return false;
      const startTs = new Date(block.start).getTime();
      const endTs = new Date(block.end).getTime();
      return Number.isFinite(startTs) && Number.isFinite(endTs) && startTs <= nowTs && nowTs < endTs;
    })
    .sort((a, b) => b.priority - a.priority || new Date(a.start).getTime() - new Date(b.start).getTime());
  return active[0] ?? null;
}

export async function GET() {
  const fallback: LiveNowPayload = {
    is_live: false,
    video_id: null,
    title: null,
    channel: null,
    thumbnail: null,
    is_premiere: false,
    started_at: null,
  };

  try {
    const now = new Date();
    const timeline = await getProgram();
    const block = pickActiveLiveBlock(timeline, now);
    if (!block?.videoId) return Response.json(fallback);

    return Response.json({
      is_live: true,
      video_id: block.videoId,
      title: block.title,
      channel: block.channel,
      thumbnail: block.thumbnail ?? null,
      is_premiere: block.type === "premiere",
      started_at: block.start,
    } satisfies LiveNowPayload);
  } catch {
    return Response.json(fallback);
  }
}

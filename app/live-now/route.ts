import { getProgram } from "@/lib/programEngine";
import type { ProgramBlock } from "@/lib/epg-types";

export const dynamic = "force-dynamic";

type LiveNowPayload = {
  is_live: boolean;
  items: Array<{
    video_id: string;
    title: string;
    channel: string;
    thumbnail: string | null;
    is_premiere: boolean;
    started_at: string;
  }>;
};

type ParsedLiveBlock = {
  videoId: string;
  title: string;
  channel: string;
  thumbnail: string | null;
  isPremiere: boolean;
  startIso: string;
  startTs: number;
  endTs: number;
};

function asObjectRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function parseLiveBlock(raw: unknown): ParsedLiveBlock | null {
  const row = asObjectRecord(raw);
  if (!row) return null;

  const videoId = readString(row.video_id) ?? readString(row.videoId);
  const title = readString(row.title);
  const channel = readString(row.channel) ?? readString(row.channel_name) ?? "ABJ TV";
  const startIso = readString(row.starts_at) ?? readString(row.start) ?? readString(row.startIso);
  const expectedEndIso = readString(row.expected_ends_at) ?? readString(row.expectedEndsAt);
  const slotEndIso = readString(row.ends_at) ?? readString(row.end) ?? readString(row.endIso);
  const type = readString(row.type);
  const durationSec = readFiniteNumber(row.video_duration_sec) ?? readFiniteNumber(row.videoDurationSec);

  if (!videoId || !title || !startIso) return null;
  const startTs = Date.parse(startIso);
  if (!Number.isFinite(startTs)) return null;

  let endTs = Number.NaN;
  const bestEndIso = expectedEndIso ?? slotEndIso;
  if (bestEndIso) {
    endTs = Date.parse(bestEndIso);
  }
  if (!Number.isFinite(endTs) && durationSec && durationSec > 0) {
    endTs = startTs + durationSec * 1000;
  }
  if (!Number.isFinite(endTs) || endTs <= startTs) return null;

  return {
    videoId,
    title,
    channel,
    thumbnail: readString(row.thumbnail),
    isPremiere: type === "premiere" || type === "upcoming",
    startIso,
    startTs,
    endTs,
  };
}

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

function extractActiveReplitLive(payload: unknown, nowTs: number): ParsedLiveBlock | null {
  const root = asObjectRecord(payload);
  if (!root) return null;

  const direct = [root.now_playing, root.nowPlaying, root.block, root.data];
  for (const row of direct) {
    const parsed = parseLiveBlock(row);
    if (parsed && parsed.startTs <= nowTs && nowTs < parsed.endTs) {
      return parsed;
    }
  }

  const blocksRaw = Array.isArray(root.blocks)
    ? root.blocks
    : Array.isArray(root.timeline)
      ? root.timeline
      : null;
  if (!blocksRaw) return null;

  const active = blocksRaw
    .map((row) => parseLiveBlock(row))
    .filter((row): row is ParsedLiveBlock => Boolean(row))
    .filter((row) => row.startTs <= nowTs && nowTs < row.endTs)
    .sort((a, b) => b.startTs - a.startTs);
  return active[0] ?? null;
}

async function tryLoadFromReplit(request: Request): Promise<ParsedLiveBlock | null> {
  const endpointUrls = [
    new URL("/api/replit/program/now", request.url).toString(),
    new URL("/api/replit/program", request.url).toString(),
  ];
  const nowTs = Date.now();

  for (const endpoint of endpointUrls) {
    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      if (!response.ok) continue;
      const payload = (await response.json()) as unknown;
      const active = extractActiveReplitLive(payload, nowTs);
      if (active) return active;
    } catch {
      // Try next endpoint.
    }
  }
  return null;
}

export async function GET(request: Request) {
  const fallback: LiveNowPayload = {
    is_live: false,
    items: [],
  };

  try {
    const externalLive = await tryLoadFromReplit(request);
    if (externalLive) {
      return Response.json({
        is_live: true,
        items: [
          {
            video_id: externalLive.videoId,
            title: externalLive.title,
            channel: externalLive.channel,
            thumbnail: externalLive.thumbnail,
            is_premiere: externalLive.isPremiere,
            started_at: externalLive.startIso,
          },
        ],
      } satisfies LiveNowPayload);
    }

    const now = new Date();
    const timeline = await getProgram();
    const block = pickActiveLiveBlock(timeline, now);
    if (!block?.videoId) return Response.json(fallback);

    return Response.json({
      is_live: true,
      items: [
        {
          video_id: block.videoId,
          title: block.title,
          channel: block.channel,
          thumbnail: block.thumbnail ?? null,
          is_premiere: block.type === "premiere",
          started_at: block.start,
        },
      ],
    } satisfies LiveNowPayload);
  } catch {
    return Response.json(fallback);
  }
}

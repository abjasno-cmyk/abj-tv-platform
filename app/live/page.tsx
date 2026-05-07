import { buildEPG } from "@/lib/buildEPG";
import { getNowPlaying, getProgram } from "@/lib/programEngine";
import { resolveProgramFeedUrlCandidates, resolveReplitApiKey } from "@/lib/replitConfig";
import LivePage from "@/app/live/LivePage";
import type { DayProgram, ProgramBlock, ProgramItem } from "@/lib/epg-types";

export const dynamic = "force-dynamic";

type ExternalNowPlaying = {
  videoId: string;
  title: string;
  channelName: string;
  startIso: string;
};

function toParts(date: Date, options: Intl.DateTimeFormatOptions): Record<string, string> {
  return new Intl.DateTimeFormat("cs-CZ", {
    timeZone: "Europe/Prague",
    ...options,
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, part) => {
      if (part.type !== "literal") {
        acc[part.type] = part.value;
      }
      return acc;
    }, {});
}

function getPragueTimeLabel(date: Date): string {
  const parts = toParts(date, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${parts.hour}:${parts.minute}`;
}

function getPragueDateKey(date: Date): string {
  const parts = toParts(date, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function readString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asObjectRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function normalizeExternalBlockType(value: string | null): ProgramBlock["type"] {
  if (value === "live") return "live";
  if (value === "premiere" || value === "upcoming") return "premiere";
  if (value === "coming_up") return "coming_up";
  if (value === "fixed_abj") return "fixed_abj";
  if (value === "ceremonial") return "ceremonial";
  return "recorded";
}

function parseExternalProgramTimeline(payload: unknown): ProgramBlock[] {
  const root = asObjectRecord(payload);
  const blocksRaw =
    root && Array.isArray(root.blocks)
      ? root.blocks
      : root && Array.isArray(root.timeline)
        ? root.timeline
        : Array.isArray(payload)
          ? payload
          : [];

  const parsed = blocksRaw
    .map((row) => asObjectRecord(row))
    .filter((row): row is Record<string, unknown> => Boolean(row))
    .map((row, index) => {
      const startIso = readString(row.starts_at) ?? readString(row.start) ?? readString(row.startIso);
      const expectedEndIso =
        readString(row.expected_ends_at) ?? readString(row.expectedEndsAt);
      const endIso = expectedEndIso ?? readString(row.ends_at) ?? readString(row.end) ?? readString(row.endIso);
      const title = readString(row.title);
      const channel = readString(row.channel) ?? readString(row.channel_name) ?? "ABJ TV";
      if (!startIso || !endIso || !title) return null;

      const startTs = new Date(startIso).getTime();
      const endTs = new Date(endIso).getTime();
      if (!Number.isFinite(startTs) || !Number.isFinite(endTs) || endTs <= startTs) return null;

      const rawType = readString(row.type);
      const isABJ = row.is_abj === true || channel.toLowerCase().includes("abj");
      const priority = Math.round(readFiniteNumber(row.priority) ?? (isABJ ? 900 : 500));
      const videoDurationSec =
        readFiniteNumber(row.video_duration_sec) ?? readFiniteNumber(row.videoDurationSec);
      const derivedDurationMin = Math.max(1, Math.round((endTs - startTs) / 60_000));
      const videoId = readString(row.video_id) ?? readString(row.videoId);
      const thumbnail = readString(row.thumbnail);

      return {
        id:
          readString(row.block_id) ??
          readString(row.id) ??
          `external-${startIso}-${videoId ?? index}`,
        start: startIso,
        end: endIso,
        durationMin:
          videoDurationSec && videoDurationSec > 0
            ? Math.max(1, Math.round(videoDurationSec / 60))
            : derivedDurationMin,
        type: normalizeExternalBlockType(rawType),
        title,
        channel,
        isABJ,
        priority,
        ...(videoId ? { videoId } : {}),
        ...(thumbnail ? { thumbnail } : {}),
      } satisfies ProgramBlock;
    })
    .filter((row): row is ProgramBlock => row !== null)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  return parsed;
}

function parseExternalNowPlaying(payload: unknown): ExternalNowPlaying | null {
  const root = asObjectRecord(payload);
  if (!root) return null;
  const blocksRaw = Array.isArray(root.blocks)
    ? root.blocks
    : Array.isArray(root.timeline)
      ? root.timeline
      : null;
  if (!blocksRaw) return null;

  const nowTs = Date.now();
  const active = blocksRaw
    .map((row) => asObjectRecord(row))
    .filter((row): row is Record<string, unknown> => Boolean(row))
    .map((row) => {
      const startIso = readString(row.starts_at) ?? readString(row.start) ?? readString(row.startIso);
      const expectedEndIso =
        readString(row.expected_ends_at) ?? readString(row.expectedEndsAt);
      const endIso = expectedEndIso ?? readString(row.ends_at) ?? readString(row.end) ?? readString(row.endIso);
      const videoId = readString(row.video_id) ?? readString(row.videoId);
      const title = readString(row.title);
      const channelName = readString(row.channel) ?? readString(row.channel_name) ?? "ABJ TV";
      if (!startIso || !endIso || !videoId || !title) return null;
      const startTs = new Date(startIso).getTime();
      const endTs = new Date(endIso).getTime();
      if (!Number.isFinite(startTs) || !Number.isFinite(endTs) || endTs <= startTs) return null;
      return { videoId, title, channelName, startIso, startTs, endTs };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .filter((row) => row.startTs <= nowTs && nowTs < row.endTs)
    .sort((a, b) => b.startTs - a.startTs);

  const top = active[0];
  if (!top) return null;
  return {
    videoId: top.videoId,
    title: top.title,
    channelName: top.channelName,
    startIso: top.startIso,
  };
}

async function loadExternalNowPlaying(): Promise<ExternalNowPlaying | null> {
  const apiKey = resolveReplitApiKey();
  if (!apiKey) return null;

  for (const candidate of resolveProgramFeedUrlCandidates()) {
    try {
      const response = await fetch(candidate, {
        headers: {
          Accept: "application/json",
          "X-Api-Key": apiKey,
        },
        cache: "no-store",
      });
      if (!response.ok) {
        if (response.status === 404) continue;
        continue;
      }
      const json = (await response.json()) as unknown;
      const parsed = parseExternalNowPlaying(json);
      if (parsed) return parsed;
    } catch (error) {
      console.warn("live-page-external-feed-now-playing-failed", error);
    }
  }
  return null;
}

async function loadExternalProgramTimeline(): Promise<ProgramBlock[]> {
  const apiKey = resolveReplitApiKey();
  if (!apiKey) return [];

  for (const candidate of resolveProgramFeedUrlCandidates()) {
    try {
      const response = await fetch(candidate, {
        headers: {
          Accept: "application/json",
          "X-Api-Key": apiKey,
        },
        cache: "no-store",
      });
      if (!response.ok) {
        if (response.status === 404) continue;
        continue;
      }
      const json = (await response.json()) as unknown;
      const parsed = parseExternalProgramTimeline(json);
      if (parsed.length > 0) return parsed;
    } catch (error) {
      console.warn("live-page-external-feed-timeline-failed", error);
    }
  }
  return [];
}

function pickNowPlayingFromTimeline(timeline: ProgramBlock[]): ProgramBlock | null {
  const nowTs = Date.now();
  const active = timeline
    .filter((block) => {
      const startTs = new Date(block.start).getTime();
      const endTs = new Date(block.end).getTime();
      return Boolean(block.videoId) && Number.isFinite(startTs) && Number.isFinite(endTs) && startTs <= nowTs && nowTs < endTs;
    })
    .sort((a, b) => b.priority - a.priority || new Date(b.start).getTime() - new Date(a.start).getTime());
  return active[0] ?? null;
}

function getPragueDayLabel(date: Date): string {
  const parts = toParts(date, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const label = `${parts.weekday} ${parts.day}. ${parts.month}`;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function toProgramItemType(block: ProgramBlock): ProgramItem["type"] {
  if (block.type === "live") return "live";
  if (block.type === "premiere") return "upcoming";
  return "vod";
}

function mapTimelineToDays(timeline: ProgramBlock[]): DayProgram[] {
  const byDate = new Map<string, DayProgram>();
  for (const block of timeline) {
    const startDate = new Date(block.start);
    if (Number.isNaN(startDate.getTime())) continue;

    const dateKey = getPragueDateKey(startDate);
    const existing = byDate.get(dateKey);
    if (!existing) {
      byDate.set(dateKey, {
        date: dateKey,
        label: getPragueDayLabel(startDate),
        items: [],
      });
    }

    byDate.get(dateKey)?.items.push({
      time: getPragueTimeLabel(startDate),
      title: block.title,
      channelName: block.channel,
      thumbnail: block.thumbnail ?? null,
      videoId: block.videoId ?? null,
      isABJ: block.isABJ,
      type: toProgramItemType(block),
      startIso: block.start,
      endIso: block.end,
    });
  }

  return [...byDate.values()]
    .map((day) => ({
      ...day,
      items: day.items.sort((a, b) => a.time.localeCompare(b.time)),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function chooseInitialItem(epg: DayProgram[]): ProgramItem | null {
  const currentTime = getPragueTimeLabel(new Date());
  const todayDateKey = getPragueDateKey(new Date());
  const todayItems = epg.find((day) => day.date === todayDateKey)?.items ?? [];

  if (todayItems.length > 0) {
    let lastPlayable: ProgramItem | null = null;
    for (const item of todayItems) {
      if (item.videoId && item.time <= currentTime) {
        lastPlayable = item;
      }
    }
    const firstPlayableToday = todayItems.find((item) => Boolean(item.videoId)) ?? null;
    return lastPlayable ?? firstPlayableToday;
  }

  // If there is no schedule entry for "today", start with the first
  // available item from the next populated day.
  for (const day of epg) {
    const firstPlayable = day.items.find((item) => Boolean(item.videoId));
    if (firstPlayable) {
      return firstPlayable;
    }
  }

  return null;
}

function findItemByVideoId(epg: DayProgram[], videoId: string): ProgramItem | null {
  for (const day of epg) {
    const found = day.items.find((item) => item.videoId === videoId && item.videoId !== null);
    if (found) return found;
  }
  return null;
}

function mapInitialTimelineOffsetSeconds(
  timeline: ProgramBlock[],
  targetVideoId: string | null
): number {
  if (!targetVideoId) return 0;
  const now = new Date();
  const nowTs = now.getTime();
  if (!Number.isFinite(nowTs)) return 0;

  const matchingBlocks = timeline
    .filter((block) => block.videoId === targetVideoId)
    .map((block) => {
      const startTs = new Date(block.start).getTime();
      const endTs = new Date(block.end).getTime();
      return { startTs, endTs };
    })
    .filter((value) => Number.isFinite(value.startTs) && Number.isFinite(value.endTs) && value.endTs > value.startTs);

  const activeBlock = matchingBlocks.find((block) => block.startTs <= nowTs && nowTs < block.endTs);
  if (!activeBlock) return 0;

  const elapsedSeconds = Math.floor((nowTs - activeBlock.startTs) / 1000);
  return Math.max(0, elapsedSeconds);
}

function mapOffsetFromStartIso(startIso: string | null): number {
  if (!startIso) return 0;
  const startTs = new Date(startIso).getTime();
  const nowTs = Date.now();
  if (!Number.isFinite(startTs) || !Number.isFinite(nowTs) || nowTs <= startTs) return 0;
  return Math.max(0, Math.floor((nowTs - startTs) / 1000));
}

export default async function LivePageServer(
  {
    searchParams,
  }: {
    searchParams?: Promise<Record<string, string | string[] | undefined>>;
  } = {}
) {
  let epg: DayProgram[] = [];
  let timeline: ProgramBlock[] = [];
  let v3NowPlaying: ProgramBlock | null = null;
  let externalNowPlaying: ExternalNowPlaying | null = null;

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const rawVideoId = resolvedSearchParams?.videoId;
  const requestedVideoId = Array.isArray(rawVideoId) ? rawVideoId[0] : rawVideoId;

  try {
    timeline = await loadExternalProgramTimeline();
    if (timeline.length > 0) {
      v3NowPlaying = pickNowPlayingFromTimeline(timeline);
      epg = mapTimelineToDays(timeline);
    }
  } catch (error) {
    console.error("live-page-external-feed-timeline-load-failed", error);
  }

  if (timeline.length === 0) {
    try {
      timeline = await getProgram();
      v3NowPlaying = await getNowPlaying();
      epg = mapTimelineToDays(timeline);
    } catch (error) {
      console.error("live-page-v3-program-failed", error);
    }
  }

  try {
    externalNowPlaying = await loadExternalNowPlaying();
  } catch (error) {
    console.error("live-page-external-now-playing-failed", error);
  }

  if (epg.length === 0 || epg.every((day) => day.items.length === 0)) {
    try {
      epg = await buildEPG(7);
    } catch (error) {
      console.error("live-page-buildEPG-fallback-failed", error);
    }
  }

  const initialFromNowPlaying = externalNowPlaying
    ? {
        videoId: externalNowPlaying.videoId,
        title: externalNowPlaying.title,
        channelName: externalNowPlaying.channelName,
      }
    : v3NowPlaying?.videoId && v3NowPlaying.title
      ? {
          videoId: v3NowPlaying.videoId,
          title: v3NowPlaying.title,
          channelName: v3NowPlaying.channel,
        }
      : null;

  const requestedItem = requestedVideoId ? findItemByVideoId(epg, requestedVideoId) : null;
  const initialItem = chooseInitialItem(epg);
  const hasRequestedVideoId = Boolean(requestedVideoId && requestedVideoId.trim().length > 0);
  const initialVideoId = hasRequestedVideoId
    ? requestedVideoId!.trim()
    : requestedItem?.videoId ??
      initialFromNowPlaying?.videoId ??
      initialItem?.videoId ??
      null;
  const initialTitle = hasRequestedVideoId
    ? requestedItem?.title ??
      initialFromNowPlaying?.title ??
      initialItem?.title ??
      "Dnes není plánované vysílání"
    : requestedItem?.title ??
      initialFromNowPlaying?.title ??
      initialItem?.title ??
      "Dnes není plánované vysílání";
  const initialChannelName = hasRequestedVideoId
    ? requestedItem?.channelName ?? initialFromNowPlaying?.channelName ?? initialItem?.channelName ?? ""
    : requestedItem?.channelName ??
      initialFromNowPlaying?.channelName ??
      initialItem?.channelName ??
      "";
  const initialStartOffsetSeconds =
    requestedVideoId && requestedVideoId.trim().length > 0
      ? mapInitialTimelineOffsetSeconds(timeline, requestedVideoId.trim())
      : externalNowPlaying && initialVideoId === externalNowPlaying.videoId
        ? mapOffsetFromStartIso(externalNowPlaying.startIso)
        : mapInitialTimelineOffsetSeconds(timeline, initialVideoId);

  return (
    <LivePage
      epg={epg}
      initialVideoId={initialVideoId}
      initialTitle={initialTitle}
      initialChannelName={initialChannelName}
      initialStartSeconds={initialStartOffsetSeconds}
    />
  );
}

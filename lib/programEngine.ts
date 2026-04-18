import "server-only";

import fs from "node:fs/promises";
import path from "node:path";
import { unstable_cache } from "next/cache";

import { buildPlaylist } from "@/lib/buildPlaylist";
import type {
  ProgramBlock,
  ProgramCandidateVideo,
  ProgramManualScheduleItem,
  ProgramOverrideRules,
} from "@/lib/epg-types";
import { getProgramFeedImport } from "@/lib/programFeedImport";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const PRAGUE_TIMEZONE = "Europe/Prague";
const CACHE_REVALIDATE_SECONDS = 900;
const MAX_VIDEO_AGE_MS = 48 * 60 * 60 * 1000;
const MAX_VIDEO_DURATION_MIN = 180;

type ProgramBundle = {
  timeline: ProgramBlock[];
  nowPlaying: ProgramBlock | null;
};

type GapSuggestion = {
  videoId: string;
  reason: string;
};

type TimelineState = {
  usedVideoIds: Set<string>;
};

type VideoRowLegacy = {
  id: string;
  source_id: string | null;
  channel_id: string | null;
  video_id: string;
  title: string;
  thumbnail: string | null;
  published_at: string | null;
  scheduled_start_time: string | null;
  kind: string | null;
  raw?: unknown;
  metadata?: unknown;
  created_at: string;
};

type VideoRowCanonical = {
  id: string;
  source_id: string | null;
  channel_id: string | null;
  video_id: string;
  title: string;
  thumbnail: string | null;
  published_at: string | null;
  scheduled_start_at: string | null;
  video_type: string | null;
  channel_name: string | null;
  is_abj: boolean | null;
  duration_min: number | null;
  live_broadcast_content: string | null;
  metadata?: unknown;
  cache_refreshed_at?: string | null;
  created_at: string;
};

function toParts(date: Date, opts: Intl.DateTimeFormatOptions): Record<string, string> {
  return new Intl.DateTimeFormat("cs-CZ", {
    timeZone: PRAGUE_TIMEZONE,
    ...opts,
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, part) => {
      if (part.type !== "literal") acc[part.type] = part.value;
      return acc;
    }, {});
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

function minutesDiff(start: Date, end: Date): number {
  return (end.getTime() - start.getTime()) / 60_000;
}

function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const p = toParts(date, {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const asUtc = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    Number(p.hour),
    Number(p.minute),
    Number(p.second)
  );
  return asUtc - date.getTime();
}

function pragueDateTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number = 0
): Date {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);
  const firstOffset = getTimeZoneOffsetMs(new Date(utcGuess), PRAGUE_TIMEZONE);
  let corrected = utcGuess - firstOffset;
  const secondOffset = getTimeZoneOffsetMs(new Date(corrected), PRAGUE_TIMEZONE);
  if (secondOffset !== firstOffset) {
    corrected = utcGuess - secondOffset;
  }
  return new Date(corrected);
}

function getTodayPragueWindow(now: Date = new Date()): { dayStart: Date; dayEnd: Date; dateKey: string } {
  const p = toParts(now, { year: "numeric", month: "2-digit", day: "2-digit" });
  const year = Number(p.year);
  const month = Number(p.month);
  const day = Number(p.day);

  const dayStart = pragueDateTimeToUtc(year, month, day, 0, 0, 0);
  const nextDay = new Date(Date.UTC(year, month - 1, day));
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  const dayEnd = pragueDateTimeToUtc(
    nextDay.getUTCFullYear(),
    nextDay.getUTCMonth() + 1,
    nextDay.getUTCDate(),
    0,
    0,
    0
  );
  return { dayStart, dayEnd, dateKey: `${p.year}-${p.month}-${p.day}` };
}

function parseIsoDurationToMinutes(value?: string | null): number {
  if (!value) return 0;
  const match = /^P(?:\d+Y)?(?:\d+M)?(?:\d+D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/i.exec(value);
  if (!match) return 0;
  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const seconds = Number(match[3] ?? 0);
  return hours * 60 + minutes + seconds / 60;
}

function sanitizeDurationMin(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.round(value * 10) / 10;
}

function overlap(a: ProgramBlock, b: ProgramBlock): boolean {
  return new Date(a.start).getTime() < new Date(b.end).getTime() && new Date(a.end).getTime() > new Date(b.start).getTime();
}

function safeArray<T>(value: T[] | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function asObjectRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

function readStringMeta(metadata: Record<string, unknown> | undefined, key: string): string | undefined {
  if (!metadata) return undefined;
  const value = metadata[key];
  return typeof value === "string" ? value : undefined;
}

function readNumberMeta(metadata: Record<string, unknown> | undefined, key: string): number | undefined {
  if (!metadata) return undefined;
  const value = metadata[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function normalizeWeekdayLabel(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

const WEEKDAY_INDEX_BY_LABEL: Record<string, number> = {
  sunday: 0,
  sun: 0,
  nedele: 0,
  nedela: 0,
  monday: 1,
  mon: 1,
  pondeli: 1,
  tuesday: 2,
  tue: 2,
  utery: 2,
  streda: 3,
  st: 3,
  wednesday: 3,
  wed: 3,
  thursday: 4,
  thu: 4,
  ctvrtek: 4,
  stvrtok: 4,
  friday: 5,
  fri: 5,
  patek: 5,
  piatok: 5,
  saturday: 6,
  sat: 6,
  sobota: 6,
};

function parseWeekdayToIndex(input?: string | number): number | null {
  if (typeof input === "number" && Number.isInteger(input) && input >= 0 && input <= 6) {
    return input;
  }
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  const asNumber = Number(trimmed);
  if (Number.isInteger(asNumber) && asNumber >= 0 && asNumber <= 6) return asNumber;
  const normalized = normalizeWeekdayLabel(trimmed);
  return WEEKDAY_INDEX_BY_LABEL[normalized] ?? null;
}

function parseTimeString(value: string): { hour: number; minute: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

function getPragueWeekdayIndex(dayStart: Date): number {
  const p = toParts(dayStart, { year: "numeric", month: "2-digit", day: "2-digit" });
  return new Date(Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day))).getUTCDay();
}

function normalizeManualScheduleItem(item: ProgramManualScheduleItem): ProgramManualScheduleItem | null {
  const videoId = typeof item.videoId === "string" ? item.videoId.trim() : "";
  const time = typeof item.time === "string" ? item.time.trim() : "";
  if (!videoId || !time || !parseTimeString(time)) return null;

  const normalized: ProgramManualScheduleItem = {
    videoId,
    time,
  };

  if (typeof item.weekday === "string" || typeof item.weekday === "number") {
    normalized.weekday = item.weekday;
  }
  if (typeof item.date === "string") {
    const date = item.date.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) normalized.date = date;
  }
  if (typeof item.title === "string" && item.title.trim()) {
    normalized.title = item.title.trim();
  }
  if (typeof item.channel === "string" && item.channel.trim()) {
    normalized.channel = item.channel.trim();
  }
  if (typeof item.isABJ === "boolean") {
    normalized.isABJ = item.isABJ;
  }

  const durationMin = sanitizeDurationMin(Number(item.durationMin ?? 0));
  if (durationMin > 0) normalized.durationMin = durationMin;

  const priority = Number(item.priority);
  if (Number.isFinite(priority)) {
    normalized.priority = Math.round(priority);
  }

  return normalized;
}

function normalizeManualScheduleItems(items: ProgramManualScheduleItem[] | undefined): ProgramManualScheduleItem[] {
  return safeArray(items)
    .map((item) => normalizeManualScheduleItem(item))
    .filter((item): item is ProgramManualScheduleItem => item !== null);
}

async function readOverrideRules(): Promise<ProgramOverrideRules> {
  try {
    const filePath = path.join(process.cwd(), "data", "program-engine-overrides.json");
    const raw = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw) as ProgramOverrideRules;
    return {
      forcedVideoIds: Array.isArray(parsed.forcedVideoIds) ? parsed.forcedVideoIds : [],
      forcedPriorityChannels: Array.isArray(parsed.forcedPriorityChannels)
        ? parsed.forcedPriorityChannels
        : [],
      manualSchedule: Array.isArray(parsed.manualSchedule) ? parsed.manualSchedule : [],
    };
  } catch {
    return { forcedVideoIds: [], forcedPriorityChannels: [], manualSchedule: [] };
  }
}

function normalizeOverrides(overrideRules?: ProgramOverrideRules): ProgramOverrideRules {
  return {
    forcedVideoIds: Array.from(new Set(safeArray(overrideRules?.forcedVideoIds).filter(Boolean))),
    forcedPriorityChannels: Array.from(
      new Set(safeArray(overrideRules?.forcedPriorityChannels).filter(Boolean))
    ),
    manualSchedule: normalizeManualScheduleItems(overrideRules?.manualSchedule),
  };
}

function candidateFromCanonicalRow(row: VideoRowCanonical): ProgramCandidateVideo {
  const metadata = asObjectRecord(row.metadata);
  const durationFromMetadata =
    readNumberMeta(metadata, "durationMin") ?? parseIsoDurationToMinutes(readStringMeta(metadata, "duration"));
  const durationMin = sanitizeDurationMin(row.duration_min ?? durationFromMetadata ?? 0);
  const channel = row.channel_name ?? readStringMeta(metadata, "channelTitle") ?? "Neznámý kanál";
  const isABJ = Boolean(row.is_abj) || channel.toLowerCase().includes("abj");

  return {
    videoId: row.video_id,
    title: row.title,
    channel,
    channelId: row.channel_id ?? undefined,
    isABJ,
    publishedAt: row.published_at,
    scheduledStartTime: row.scheduled_start_at ?? readStringMeta(metadata, "scheduledStartTime") ?? null,
    actualStartTime: readStringMeta(metadata, "actualStartTime") ?? null,
    durationMin: durationMin > 0 ? durationMin : 30,
    liveBroadcastContent:
      row.live_broadcast_content === "live" || row.live_broadcast_content === "upcoming"
        ? row.live_broadcast_content
        : row.video_type === "upcoming"
          ? "upcoming"
          : "none",
    thumbnail: row.thumbnail,
    metadata,
  };
}

async function loadCachedCandidates(): Promise<ProgramCandidateVideo[]> {
  const supabase = await createSupabaseServerClient();

  const canonical = await supabase
    .from("videos")
    .select(
      "id, source_id, channel_id, video_id, title, thumbnail, published_at, scheduled_start_at, video_type, channel_name, is_abj, duration_min, live_broadcast_content, metadata, cache_refreshed_at, created_at"
    )
    .order("published_at", { ascending: false })
    .limit(800);

  if (!canonical.error) {
    return (canonical.data as VideoRowCanonical[]).map(candidateFromCanonicalRow);
  }

  const maybeSchemaMismatch = /(column|relation) .* does not exist/i.test(canonical.error.message);
  if (!maybeSchemaMismatch) {
    throw new Error(`Failed to load program cache: ${canonical.error.message}`);
  }

  const legacy = await supabase
    .from("videos")
    .select("id, source_id, channel_id, video_id, title, thumbnail, published_at, scheduled_start_time, kind, raw, metadata, created_at")
    .order("published_at", { ascending: false })
    .limit(800);

  if (legacy.error) {
    throw new Error(`Failed to load program cache (legacy fallback): ${legacy.error.message}`);
  }

  const sourceIds = Array.from(
    new Set(
      ((legacy.data ?? []) as VideoRowLegacy[])
        .map((row) => row.source_id)
        .filter((id): id is string => Boolean(id))
    )
  );

  let sourceNameById = new Map<string, string>();
  if (sourceIds.length > 0) {
    const { data: sourceRows } = await supabase.from("sources").select("id, source_name").in("id", sourceIds);
    sourceNameById = new Map((sourceRows ?? []).map((row) => [row.id as string, row.source_name as string]));
  }

  return ((legacy.data ?? []) as VideoRowLegacy[]).map((row) => {
    const metadata = asObjectRecord(row.metadata) ?? asObjectRecord(row.raw);
    const sourceName =
      (row.source_id ? sourceNameById.get(row.source_id) : undefined) ??
      readStringMeta(metadata, "channelTitle") ??
      "Neznámý kanál";
    return {
      videoId: row.video_id,
      title: row.title,
      channel: sourceName,
      channelId: row.channel_id ?? undefined,
      isABJ: sourceName.toLowerCase().includes("abj"),
      publishedAt: row.published_at,
      scheduledStartTime: row.scheduled_start_time,
      actualStartTime: readStringMeta(metadata, "actualStartTime") ?? null,
      durationMin:
        sanitizeDurationMin(
          readNumberMeta(metadata, "durationMin") ?? parseIsoDurationToMinutes(readStringMeta(metadata, "duration"))
        ) || 30,
      liveBroadcastContent: row.kind === "upcoming" ? "upcoming" : "none",
      thumbnail: row.thumbnail,
      metadata,
    } satisfies ProgramCandidateVideo;
  });
}

function dedupeCandidatesByVideoId(videos: ProgramCandidateVideo[]): ProgramCandidateVideo[] {
  const seen = new Set<string>();
  const result: ProgramCandidateVideo[] = [];
  for (const video of videos) {
    if (seen.has(video.videoId)) continue;
    seen.add(video.videoId);
    result.push(video);
  }
  return result;
}

function preFilterRecordedCandidates(videos: ProgramCandidateVideo[], now: Date): ProgramCandidateVideo[] {
  return dedupeCandidatesByVideoId(videos)
    .filter((video) => {
      if (!video.videoId) return false;
      if (video.liveBroadcastContent === "live") return false;
      if (video.durationMin <= 0 || video.durationMin > MAX_VIDEO_DURATION_MIN) return false;
      if (!video.publishedAt) return false;
      const age = now.getTime() - new Date(video.publishedAt).getTime();
      if (!Number.isFinite(age) || age < 0) return false;
      return age <= MAX_VIDEO_AGE_MS;
    })
    .sort((a, b) => {
      const aTs = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const bTs = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return bTs - aTs;
    });
}

function normalizeBlock(block: ProgramBlock): ProgramBlock {
  return {
    ...block,
    durationMin: sanitizeDurationMin(block.durationMin),
    alternatives: safeArray(block.alternatives),
  };
}

function insertWithConflictResolution(timeline: ProgramBlock[], incoming: ProgramBlock): ProgramBlock[] {
  const block = normalizeBlock(incoming);
  const conflicts = timeline.filter((existing) => overlap(existing, block));
  if (conflicts.length === 0) {
    return [...timeline, block].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }

  const highestConflict = conflicts.reduce((best, current) => (current.priority > best.priority ? current : best));
  if (highestConflict.priority >= block.priority) {
    return timeline.map((existing) => {
      if (existing.id !== highestConflict.id) return existing;
      return {
        ...existing,
        alternatives: [...safeArray(existing.alternatives), block],
      };
    });
  }

  const winners = timeline.filter((existing) => !conflicts.some((conflict) => conflict.id === existing.id));
  const promoted: ProgramBlock = {
    ...block,
    alternatives: [...safeArray(block.alternatives), ...conflicts],
  };
  return [...winners, promoted].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
}

function pickCeremonialDurations(candidates: ProgramCandidateVideo[]): { czech: number; slovak: number } {
  const czech =
    candidates.find((video) => video.videoId === "s_dNWH7p5YM")?.durationMin ??
    parseIsoDurationToMinutes("PT2M");
  const slovak =
    candidates.find((video) => video.videoId === "jMZYJdd5kO0")?.durationMin ??
    parseIsoDurationToMinutes("PT2M");
  return {
    czech: czech > 0 ? czech : 2,
    slovak: slovak > 0 ? slovak : 2,
  };
}

function buildCeremonialBlocks(dayStart: Date, candidates: ProgramCandidateVideo[]): ProgramBlock[] {
  const durations = pickCeremonialDurations(candidates);
  const czechStart = dayStart;
  const czechEnd = addMinutes(czechStart, durations.czech);
  const slovakStart = czechEnd;
  const slovakEnd = addMinutes(slovakStart, durations.slovak);

  return [
    {
      id: "ceremonial-czech-anthem",
      start: czechStart.toISOString(),
      end: czechEnd.toISOString(),
      durationMin: durations.czech,
      type: "ceremonial",
      title: "Česká státní hymna",
      videoId: "s_dNWH7p5YM",
      channel: "ABJ Ceremonial",
      isABJ: true,
      priority: 1000,
    },
    {
      id: "ceremonial-slovak-anthem",
      start: slovakStart.toISOString(),
      end: slovakEnd.toISOString(),
      durationMin: durations.slovak,
      type: "ceremonial",
      title: "Slovenská státní hymna",
      videoId: "jMZYJdd5kO0",
      channel: "ABJ Ceremonial",
      isABJ: true,
      priority: 1000,
    },
  ];
}

function fixedBlockStartForToday(dayStart: Date, hour: number, minute: number): Date {
  const parts = toParts(dayStart, { year: "numeric", month: "2-digit", day: "2-digit" });
  return pragueDateTimeToUtc(Number(parts.year), Number(parts.month), Number(parts.day), hour, minute, 0);
}

function buildFixedABJBlocks(dayStart: Date): ProgramBlock[] {
  const reportazStart = fixedBlockStartForToday(dayStart, 17, 0);
  const jasneStart = fixedBlockStartForToday(dayStart, 19, 0);
  const ziveStart = fixedBlockStartForToday(dayStart, 20, 0);

  return [
    {
      id: "fixed-abj-reportaz",
      start: reportazStart.toISOString(),
      end: addMinutes(reportazStart, 60).toISOString(),
      durationMin: 60,
      type: "fixed_abj",
      title: "Reportáž ABJ",
      channel: "ABJ TV",
      isABJ: true,
      priority: 900,
    },
    {
      id: "fixed-abj-jasne-zpravy",
      start: jasneStart.toISOString(),
      end: addMinutes(jasneStart, 60).toISOString(),
      durationMin: 60,
      type: "fixed_abj",
      title: "Jasné zprávy",
      channel: "ABJ TV",
      isABJ: true,
      priority: 900,
    },
    {
      id: "fixed-abj-zive",
      start: ziveStart.toISOString(),
      end: addMinutes(ziveStart, 90).toISOString(),
      durationMin: 90,
      type: "fixed_abj",
      title: "Živě ABJ",
      channel: "ABJ TV",
      isABJ: true,
      priority: 900,
    },
  ];
}

function buildLiveAndPremiereBlocks(
  candidates: ProgramCandidateVideo[],
  dayStart: Date,
  dayEnd: Date,
  now: Date
): ProgramBlock[] {
  const blocks: ProgramBlock[] = [];
  for (const video of candidates) {
    const isLive = video.liveBroadcastContent === "live";
    const isPremiere =
      video.liveBroadcastContent === "upcoming" &&
      !!video.scheduledStartTime &&
      new Date(video.scheduledStartTime).getTime() > now.getTime();

    if (!isLive && !isPremiere) continue;

    const start = isLive
      ? new Date(video.actualStartTime ?? video.scheduledStartTime ?? video.publishedAt ?? now.toISOString())
      : new Date(video.scheduledStartTime ?? video.publishedAt ?? now.toISOString());
    if (Number.isNaN(start.getTime())) continue;

    const duration = sanitizeDurationMin(video.durationMin > 0 ? video.durationMin : isPremiere ? 60 : 120);
    const end = addMinutes(start, duration);
    if (end.getTime() <= dayStart.getTime() || start.getTime() >= dayEnd.getTime()) continue;

    blocks.push({
      id: `${isLive ? "live" : "premiere"}-${video.videoId}`,
      start: start.toISOString(),
      end: end.toISOString(),
      durationMin: duration,
      type: isLive ? "live" : "premiere",
      title: video.title,
      videoId: video.videoId,
      channel: video.channel,
      isABJ: video.isABJ,
      priority: isLive ? (video.isABJ ? 880 : 820) : video.isABJ ? 860 : 800,
      thumbnail: video.thumbnail ?? undefined,
    });
  }
  return blocks.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
}

function buildFallbackRecordedCandidate(candidates: ProgramCandidateVideo[]): ProgramCandidateVideo | null {
  const sorted = [...candidates].sort((a, b) => {
    const aPub = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    const bPub = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    return bPub - aPub;
  });
  const latestABJ = sorted.find((video) => video.isABJ);
  if (latestABJ) return latestABJ;

  const bySubscribers = [...sorted].sort((a, b) => {
    const aSubs = Number((a.metadata?.subscriberCount as number | string | undefined) ?? 0);
    const bSubs = Number((b.metadata?.subscriberCount as number | string | undefined) ?? 0);
    return bSubs - aSubs;
  });
  return bySubscribers[0] ?? null;
}

function shouldAvoidConsecutiveChannel(
  candidate: ProgramCandidateVideo,
  previousChannel: string | null
): boolean {
  if (!previousChannel) return false;
  if (candidate.isABJ) return false;
  return candidate.channel === previousChannel;
}

function scoreCandidate(
  candidate: ProgramCandidateVideo,
  gapDuration: number,
  previousChannel: string | null,
  overrideRules: ProgramOverrideRules
): number {
  const publishedTs = candidate.publishedAt ? new Date(candidate.publishedAt).getTime() : 0;
  const recencyScore = publishedTs > 0 ? publishedTs / 1_000_000_000 : 0;
  const fitScore = 100 - Math.min(Math.abs(candidate.durationMin - gapDuration) * 8, 100);
  const abjBoost = candidate.isABJ ? 70 : 0;
  const forcedChannelBoost = safeArray(overrideRules.forcedPriorityChannels).includes(candidate.channel) ? 60 : 0;
  const channelPenalty = shouldAvoidConsecutiveChannel(candidate, previousChannel) ? -500 : 0;
  return fitScore + abjBoost + forcedChannelBoost + recencyScore + channelPenalty;
}

function suggestVideosForGap(
  gapDuration: number,
  filteredVideos: ProgramCandidateVideo[],
  previousChannel: string | null,
  overrideRules: ProgramOverrideRules
): GapSuggestion[] {
  return [...filteredVideos]
    .sort((a, b) => scoreCandidate(b, gapDuration, previousChannel, overrideRules) - scoreCandidate(a, gapDuration, previousChannel, overrideRules))
    .slice(0, 12)
    .map((video) => {
      const reasons: string[] = [];
      if (video.isABJ) reasons.push("ABJ priorita");
      if (safeArray(overrideRules.forcedPriorityChannels).includes(video.channel)) {
        reasons.push("prioritní kanál");
      }
      const fitDelta = Math.abs(video.durationMin - gapDuration);
      reasons.push(`fit ±${fitDelta.toFixed(1)} min`);
      return {
        videoId: video.videoId,
        reason: reasons.join(", "),
      };
    });
}

function chooseCandidateForGap(
  gapDuration: number,
  candidates: ProgramCandidateVideo[],
  state: TimelineState,
  previousChannel: string | null,
  overrideRules: ProgramOverrideRules
): ProgramCandidateVideo | null {
  const deduped = candidates.filter((video) => !state.usedVideoIds.has(video.videoId));
  if (deduped.length === 0) return null;

  const suggestions = suggestVideosForGap(gapDuration, deduped, previousChannel, overrideRules);
  for (const suggestion of suggestions) {
    const candidate = deduped.find((video) => video.videoId === suggestion.videoId);
    if (!candidate) continue;
    if (shouldAvoidConsecutiveChannel(candidate, previousChannel)) continue;
    const fits = Math.abs(candidate.durationMin - gapDuration) <= 2 || candidate.durationMin < gapDuration;
    if (!fits) continue;
    return candidate;
  }
  return null;
}

function createRecordedBlock(
  start: Date,
  end: Date,
  candidate: ProgramCandidateVideo,
  priority: number
): ProgramBlock {
  return {
    id: `recorded-${candidate.videoId}-${start.getTime()}`,
    start: start.toISOString(),
    end: end.toISOString(),
    durationMin: sanitizeDurationMin(minutesDiff(start, end)),
    type: "recorded",
    title: candidate.title,
    videoId: candidate.videoId,
    channel: candidate.channel,
    isABJ: candidate.isABJ,
    priority,
    thumbnail: candidate.thumbnail ?? undefined,
  };
}

function createComingUpBlock(start: Date, end: Date): ProgramBlock {
  return {
    id: `coming-up-${start.getTime()}`,
    start: start.toISOString(),
    end: end.toISOString(),
    durationMin: sanitizeDurationMin(minutesDiff(start, end)),
    type: "coming_up",
    title: "Za chvíli začínáme",
    channel: "ABJ TV",
    isABJ: true,
    priority: 100,
  };
}

function createStaticFallbackRecordedBlock(start: Date, end: Date): ProgramBlock {
  return {
    id: `fallback-recorded-${start.getTime()}`,
    start: start.toISOString(),
    end: end.toISOString(),
    durationMin: sanitizeDurationMin(minutesDiff(start, end)),
    type: "recorded",
    title: "ABJ Archiv (fallback)",
    channel: "ABJ TV",
    isABJ: true,
    priority: 280,
  };
}

function fillSingleGap(
  gapStart: Date,
  gapEnd: Date,
  candidates: ProgramCandidateVideo[],
  state: TimelineState,
  overrideRules: ProgramOverrideRules,
  previousChannel: string | null
): ProgramBlock[] {
  const gapDuration = minutesDiff(gapStart, gapEnd);
  if (gapDuration <= 0) return [];
  if (gapDuration < 15) {
    return [createComingUpBlock(gapStart, gapEnd)];
  }

  const blocks: ProgramBlock[] = [];
  let cursor = new Date(gapStart);
  let remaining = minutesDiff(cursor, gapEnd);
  let cursorPrevChannel = previousChannel;

  while (remaining >= 15) {
    const selected = chooseCandidateForGap(remaining, candidates, state, cursorPrevChannel, overrideRules);
    if (!selected) break;

    const rawDuration = Math.min(selected.durationMin, remaining);
    const duration = rawDuration > remaining - 2 ? remaining : rawDuration;
    const blockEnd = addMinutes(cursor, duration);
    const block = createRecordedBlock(cursor, blockEnd, selected, 320);
    blocks.push(block);
    state.usedVideoIds.add(selected.videoId);
    cursor = blockEnd;
    remaining = minutesDiff(cursor, gapEnd);
    cursorPrevChannel = selected.channel;
  }

  if (remaining > 0) {
    if (remaining < 15) {
      blocks.push(createComingUpBlock(cursor, gapEnd));
    } else {
      const fallbackCandidate = buildFallbackRecordedCandidate(candidates);
      if (fallbackCandidate) {
        const fallbackBlock = createRecordedBlock(cursor, gapEnd, fallbackCandidate, 300);
        state.usedVideoIds.add(fallbackCandidate.videoId);
        blocks.push(fallbackBlock);
      } else {
        blocks.push(createStaticFallbackRecordedBlock(cursor, gapEnd));
      }
    }
  }

  return blocks;
}

function collectForcedBlocks(
  overrideRules: ProgramOverrideRules,
  candidates: ProgramCandidateVideo[],
  dayStart: Date
): ProgramBlock[] {
  const forcedIds = safeArray(overrideRules.forcedVideoIds);
  const forcedBlocks: ProgramBlock[] = [];
  let cursor = addMinutes(dayStart, 5);

  for (const forcedVideoId of forcedIds) {
    const candidate = candidates.find((video) => video.videoId === forcedVideoId);
    if (!candidate) continue;
    const duration = candidate.durationMin > 0 ? candidate.durationMin : 30;
    const end = addMinutes(cursor, duration);
    forcedBlocks.push({
      id: `forced-${forcedVideoId}`,
      start: cursor.toISOString(),
      end: end.toISOString(),
      durationMin: duration,
      type: "recorded",
      title: candidate.title,
      videoId: candidate.videoId,
      channel: candidate.channel,
      isABJ: candidate.isABJ,
      priority: 700,
      thumbnail: candidate.thumbnail ?? undefined,
    });
    cursor = addMinutes(end, 1);
  }

  return forcedBlocks;
}

function shouldApplyManualSlotToday(
  item: ProgramManualScheduleItem,
  dayStart: Date,
  dateKey: string
): boolean {
  if (item.date && item.date !== dateKey) return false;
  if (item.weekday === undefined) return true;
  const weekdayIndex = parseWeekdayToIndex(item.weekday);
  if (weekdayIndex === null) return false;
  return weekdayIndex === getPragueWeekdayIndex(dayStart);
}

function collectManualScheduleBlocks(
  overrideRules: ProgramOverrideRules,
  candidates: ProgramCandidateVideo[],
  dayStart: Date,
  dayEnd: Date,
  dateKey: string
): ProgramBlock[] {
  const schedule = safeArray(overrideRules.manualSchedule);
  if (schedule.length === 0) return [];

  const day = toParts(dayStart, { year: "numeric", month: "2-digit", day: "2-digit" });
  const blocks: ProgramBlock[] = [];

  for (const [index, item] of schedule.entries()) {
    if (!shouldApplyManualSlotToday(item, dayStart, dateKey)) continue;
    const time = parseTimeString(item.time);
    if (!time) continue;

    const start = pragueDateTimeToUtc(
      Number(day.year),
      Number(day.month),
      Number(day.day),
      time.hour,
      time.minute,
      0
    );
    if (start.getTime() < dayStart.getTime() || start.getTime() >= dayEnd.getTime()) continue;

    const candidate = candidates.find((video) => video.videoId === item.videoId);
    const rawDuration = item.durationMin ?? candidate?.durationMin ?? 60;
    const duration = sanitizeDurationMin(rawDuration) || 60;
    const unclampedEnd = addMinutes(start, duration);
    const end = unclampedEnd.getTime() > dayEnd.getTime() ? new Date(dayEnd) : unclampedEnd;
    if (end.getTime() <= start.getTime()) continue;

    const channel = item.channel ?? candidate?.channel ?? "ABJ TV";
    const isABJ = item.isABJ ?? candidate?.isABJ ?? channel.toLowerCase().includes("abj");
    blocks.push({
      id: `manual-${index}-${item.videoId}-${time.hour}-${time.minute}`,
      start: start.toISOString(),
      end: end.toISOString(),
      durationMin: sanitizeDurationMin(minutesDiff(start, end)),
      type: "recorded",
      title: item.title ?? candidate?.title ?? `Ruční slot ${item.videoId}`,
      videoId: item.videoId,
      channel,
      isABJ,
      priority: item.priority ?? 950,
      thumbnail: candidate?.thumbnail ?? undefined,
    });
  }

  return blocks.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
}

function finalizeTimeline(blocks: ProgramBlock[]): ProgramBlock[] {
  return blocks
    .map(normalizeBlock)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
}

export function fillGapsWithAI(
  timeline: ProgramBlock[],
  candidateVideos: ProgramCandidateVideo[],
  overrideRules: ProgramOverrideRules = {}
): ProgramBlock[] {
  if (timeline.length < 2) return timeline;

  const filtered = preFilterRecordedCandidates(candidateVideos, new Date());
  const state: TimelineState = {
    usedVideoIds: new Set(timeline.map((block) => block.videoId).filter((value): value is string => Boolean(value))),
  };

  const sorted = finalizeTimeline(timeline);
  const result: ProgramBlock[] = [sorted[0]];
  for (let idx = 1; idx < sorted.length; idx += 1) {
    const previous = result[result.length - 1];
    const current = sorted[idx];
    const gapBlocks = fillSingleGap(
      new Date(previous.end),
      new Date(current.start),
      filtered,
      state,
      overrideRules,
      previous.channel
    );
    result.push(...gapBlocks, current);
  }
  return finalizeTimeline(result);
}

function pickNowPlaying(timeline: ProgramBlock[], candidates: ProgramCandidateVideo[]): ProgramBlock | null {
  const liveBlocks = timeline
    .filter((block) => block.type === "live")
    .sort((a, b) => b.priority - a.priority || new Date(b.start).getTime() - new Date(a.start).getTime());
  if (liveBlocks.length > 0) return liveBlocks[0] ?? null;

  const latestABJ = [...candidates]
    .filter((video) => video.isABJ)
    .sort((a, b) => {
      const aTs = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const bTs = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return bTs - aTs;
    })[0];
  if (!latestABJ) return null;

  const now = new Date();
  const end = addMinutes(now, latestABJ.durationMin > 0 ? latestABJ.durationMin : 30);
  return {
    id: `now-playing-abj-${latestABJ.videoId}`,
    start: now.toISOString(),
    end: end.toISOString(),
    durationMin: sanitizeDurationMin(minutesDiff(now, end)),
    type: "recorded",
    title: latestABJ.title,
    videoId: latestABJ.videoId,
    channel: latestABJ.channel,
    isABJ: true,
    priority: 500,
    thumbnail: latestABJ.thumbnail ?? undefined,
  };
}

async function loadCandidateVideosWithFallback(): Promise<ProgramCandidateVideo[]> {
  try {
    const cached = await loadCachedCandidates();
    if (cached.length > 0) return cached;
  } catch (error) {
    console.warn("V3 cache read failed, switching to direct playlist fallback", error);
  }

  try {
    const playlist = await buildPlaylist();
    return playlist.map((item) => ({
      videoId: item.videoId,
      title: item.title,
      channel: item.channelName,
      isABJ: item.channelName.toLowerCase().includes("abj"),
      publishedAt: item.publishedAt ?? null,
      scheduledStartTime: null,
      actualStartTime: null,
      durationMin: 30,
      liveBroadcastContent: "none",
      metadata: {},
    }));
  } catch (error) {
    console.error("Direct playlist fallback failed", error);
    return [];
  }
}

async function buildProgramBundleInternal(inputOverrides?: ProgramOverrideRules): Promise<ProgramBundle> {
  const importedFeed = await getProgramFeedImport();
  const fileOverrides = await readOverrideRules();
  const runtimeOverrides = normalizeOverrides(inputOverrides);
  const mergedOverrides: ProgramOverrideRules = normalizeOverrides({
    forcedVideoIds: [
      ...safeArray(fileOverrides.forcedVideoIds),
      ...safeArray(runtimeOverrides.forcedVideoIds),
    ],
    forcedPriorityChannels: [
      ...safeArray(fileOverrides.forcedPriorityChannels),
      ...safeArray(runtimeOverrides.forcedPriorityChannels),
    ],
    manualSchedule: [
      ...safeArray(importedFeed.manualSchedule),
      ...safeArray(fileOverrides.manualSchedule),
      ...safeArray(runtimeOverrides.manualSchedule),
    ],
  });

  const now = new Date();
  const { dayStart, dayEnd, dateKey } = getTodayPragueWindow(now);
  const candidates = await loadCandidateVideosWithFallback();

  let timeline: ProgramBlock[] = [];

  for (const block of buildCeremonialBlocks(dayStart, candidates)) {
    timeline = insertWithConflictResolution(timeline, block);
  }
  for (const block of buildFixedABJBlocks(dayStart)) {
    timeline = insertWithConflictResolution(timeline, block);
  }
  for (const block of collectManualScheduleBlocks(mergedOverrides, candidates, dayStart, dayEnd, dateKey)) {
    timeline = insertWithConflictResolution(timeline, block);
  }
  for (const block of collectForcedBlocks(mergedOverrides, candidates, dayStart)) {
    timeline = insertWithConflictResolution(timeline, block);
  }
  for (const block of buildLiveAndPremiereBlocks(candidates, dayStart, dayEnd, now)) {
    timeline = insertWithConflictResolution(timeline, block);
  }

  const filteredRecorded = preFilterRecordedCandidates(candidates, now);
  const fillState: TimelineState = {
    usedVideoIds: new Set(
      timeline.map((block) => block.videoId).filter((videoId): videoId is string => Boolean(videoId))
    ),
  };

  const sortedBase = finalizeTimeline(timeline);
  const withGapsFilled: ProgramBlock[] = [];
  let cursor = dayStart;
  let previousChannel: string | null = null;
  for (const block of sortedBase) {
    const gapBlocks = fillSingleGap(
      cursor,
      new Date(block.start),
      filteredRecorded,
      fillState,
      mergedOverrides,
      previousChannel
    );
    withGapsFilled.push(...gapBlocks, block);
    cursor = new Date(block.end);
    previousChannel = block.channel;
  }

  if (cursor.getTime() < dayEnd.getTime()) {
    withGapsFilled.push(
      ...fillSingleGap(cursor, dayEnd, filteredRecorded, fillState, mergedOverrides, previousChannel)
    );
  }

  const deterministicTimeline = finalizeTimeline(withGapsFilled);
  const nowPlaying = pickNowPlaying(deterministicTimeline, candidates);
  return {
    timeline: deterministicTimeline,
    nowPlaying,
  };
}

async function getProgramBundleCached(overrideRules: ProgramOverrideRules): Promise<ProgramBundle> {
  const key = JSON.stringify(normalizeOverrides(overrideRules));
  const cached = unstable_cache(
    async () => buildProgramBundleInternal(overrideRules),
    ["program-engine-v3", key],
    { revalidate: CACHE_REVALIDATE_SECONDS }
  );
  return cached();
}

function buildDeterministicMinimalFallback(now: Date): ProgramBlock[] {
  const { dayStart, dayEnd } = getTodayPragueWindow(now);
  const base = [...buildCeremonialBlocks(dayStart, []), ...buildFixedABJBlocks(dayStart)];
  const sorted = finalizeTimeline(base);
  const output: ProgramBlock[] = [];
  let cursor = dayStart;
  for (const block of sorted) {
    if (cursor.getTime() < new Date(block.start).getTime()) {
      output.push(createStaticFallbackRecordedBlock(cursor, new Date(block.start)));
    }
    output.push(block);
    cursor = new Date(block.end);
  }
  if (cursor.getTime() < dayEnd.getTime()) {
    output.push(createStaticFallbackRecordedBlock(cursor, dayEnd));
  }
  return finalizeTimeline(output);
}

export async function getProgram(overrideRules: ProgramOverrideRules = {}): Promise<ProgramBlock[]> {
  try {
    const bundle = await getProgramBundleCached(overrideRules);
    return bundle.timeline;
  } catch (error) {
    console.error("getProgram failed, returning deterministic minimal fallback", error);
    return buildDeterministicMinimalFallback(new Date());
  }
}

export async function getNowPlaying(overrideRules: ProgramOverrideRules = {}): Promise<ProgramBlock | null> {
  try {
    const bundle = await getProgramBundleCached(overrideRules);
    return bundle.nowPlaying;
  } catch (error) {
    console.error("getNowPlaying failed", error);
    return null;
  }
}

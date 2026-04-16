import "server-only";

import fs from "node:fs/promises";
import path from "node:path";
import { unstable_cache } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { DayProgram, ProgramItem, ProgramOverrideItem } from "@/lib/epg-types";

type SourceRow = {
  id: string;
  source_name: string;
  channel_id: string | null;
};

type SearchResponse = {
  items?: Array<{
    id?: { videoId?: string };
    snippet?: {
      title?: string;
      publishedAt?: string;
      thumbnails?: {
        medium?: { url?: string };
        high?: { url?: string };
        default?: { url?: string };
      };
    };
  }>;
};

type VideosResponse = {
  items?: Array<{
    id?: string;
    snippet?: {
      title?: string;
      publishedAt?: string;
      thumbnails?: {
        medium?: { url?: string };
        high?: { url?: string };
        default?: { url?: string };
      };
    };
    liveStreamingDetails?: {
      scheduledStartTime?: string;
    };
  }>;
};

type YoutubeVideoKind = "upcoming" | "vod";

type CollectedVideo = {
  sourceName: string;
  videoId: string;
  title: string;
  thumbnail: string | null;
  scheduledStartTime: string;
  isABJ: boolean;
  kind: YoutubeVideoKind;
};

const PRAGUE_TIMEZONE = "Europe/Prague";
const YT_BASE = "https://www.googleapis.com/youtube/v3";
const MAX_RESULTS = 50;

function parseEnv(value?: string): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  const maybeAssigned = trimmed.includes("=") ? trimmed.slice(trimmed.indexOf("=") + 1).trim() : trimmed;
  if (
    (maybeAssigned.startsWith('"') && maybeAssigned.endsWith('"')) ||
    (maybeAssigned.startsWith("'") && maybeAssigned.endsWith("'"))
  ) {
    return maybeAssigned.slice(1, -1).trim();
  }
  return maybeAssigned;
}

function getYouTubeApiKey(): string | null {
  return parseEnv(process.env.YOUTUBE_API_KEY) ?? null;
}

function toParts(date: Date, opts: Intl.DateTimeFormatOptions): Record<string, string> {
  return new Intl.DateTimeFormat("cs-CZ", { timeZone: PRAGUE_TIMEZONE, ...opts })
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, part) => {
      if (part.type !== "literal") acc[part.type] = part.value;
      return acc;
    }, {});
}

function toDateKey(date: Date): string {
  const p = toParts(date, { year: "numeric", month: "2-digit", day: "2-digit" });
  return `${p.year}-${p.month}-${p.day}`;
}

function toTimeLabel(date: Date): string {
  const p = toParts(date, { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${p.hour}:${p.minute}`;
}

function toDayLabel(date: Date): string {
  const p = toParts(date, { weekday: "long", day: "numeric", month: "long" });
  const label = `${p.weekday} ${p.day}. ${p.month}`;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function makeProgram(days: number): DayProgram[] {
  const now = new Date();
  return Array.from({ length: days }, (_, idx) => {
    const d = new Date(now);
    d.setUTCDate(now.getUTCDate() + idx);
    return { date: toDateKey(d), label: toDayLabel(d), items: [] };
  });
}

function isABJChannel(sourceName: string): boolean {
  return sourceName.includes("ABJ") || sourceName === "ABJ TV";
}

async function readOverrides(): Promise<ProgramOverrideItem[]> {
  try {
    const filePath = path.join(process.cwd(), "data", "program-override.json");
    const raw = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw) as ProgramOverrideItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function fetchSearch(channelId: string, apiKey: string, upcoming: boolean): Promise<SearchResponse> {
  const url = new URL(`${YT_BASE}/search`);
  url.searchParams.set("part", "snippet");
  url.searchParams.set("channelId", channelId);
  url.searchParams.set("type", "video");
  url.searchParams.set("order", "date");
  url.searchParams.set("maxResults", String(upcoming ? MAX_RESULTS : 3));
  if (upcoming) {
    url.searchParams.set("eventType", "upcoming");
  }
  url.searchParams.set("key", apiKey);

  const res = await fetch(url.toString(), { next: { revalidate: 1800 } });
  if (!res.ok) throw new Error(`YouTube search failed (${res.status})`);
  return (await res.json()) as SearchResponse;
}

async function fetchDetails(videoIds: string[], apiKey: string): Promise<VideosResponse> {
  if (!videoIds.length) return { items: [] };
  const url = new URL(`${YT_BASE}/videos`);
  url.searchParams.set("part", "liveStreamingDetails,snippet");
  url.searchParams.set("id", videoIds.slice(0, MAX_RESULTS).join(","));
  url.searchParams.set("key", apiKey);

  const res = await fetch(url.toString(), { next: { revalidate: 1800 } });
  if (!res.ok) throw new Error(`YouTube details failed (${res.status})`);
  return (await res.json()) as VideosResponse;
}

function toCollected(
  source: SourceRow,
  details: VideosResponse,
  vodFallback: boolean
): CollectedVideo[] {
  const out: CollectedVideo[] = [];
  for (const item of details.items ?? []) {
    const videoId = item.id;
    const title = item.snippet?.title;
    const scheduled = item.liveStreamingDetails?.scheduledStartTime;

    let scheduledStartTime = scheduled;
    if (!scheduledStartTime && vodFallback) {
      scheduledStartTime = item.snippet?.publishedAt ?? new Date().toISOString();
    }
    if (!videoId || !title || !scheduledStartTime) continue;

    const parsed = new Date(scheduledStartTime);
    if (Number.isNaN(parsed.getTime())) continue;

    const thumbnail =
      item.snippet?.thumbnails?.medium?.url ??
      item.snippet?.thumbnails?.high?.url ??
      item.snippet?.thumbnails?.default?.url ??
      null;

    out.push({
      sourceName: source.source_name,
      videoId,
      title,
      thumbnail,
      scheduledStartTime: parsed.toISOString(),
      isABJ: isABJChannel(source.source_name),
      kind: vodFallback ? "vod" : "upcoming",
    });
  }
  return out;
}

function applyOverrides(days: DayProgram[], overrides: ProgramOverrideItem[]): void {
  const map = new Map(days.map((d) => [d.date, d]));
  for (const o of overrides) {
    const day = map.get(o.date);
    if (!day) continue;
    const entry: ProgramItem = {
      time: o.time,
      title: o.title,
      channelName: o.channelName,
      thumbnail: o.thumbnail,
      videoId: o.videoId,
      isABJ: o.isABJ,
      type: "override",
    };
    const i = day.items.findIndex((x) => x.time === o.time);
    if (i >= 0) day.items[i] = entry;
    else day.items.push(entry);
  }
}

async function buildEPGInternal(days: number): Promise<DayProgram[]> {
  const safeDays = Math.max(1, Math.min(days, 14));
  const empty = makeProgram(safeDays);
  const apiKey = getYouTubeApiKey();

  if (!apiKey) {
    console.warn("YOUTUBE_API_KEY not set — EPG disabled");
    return empty;
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("sources")
      .select("id, source_name, channel_id")
      .eq("platform", "youtube")
      .eq("active", true)
      .not("channel_id", "is", null)
      .order("priority", { ascending: true })
      .order("source_name", { ascending: true });

    if (error) throw new Error(`Failed to load sources: ${error.message}`);

    const sources = (data ?? []) as SourceRow[];
    const collected: CollectedVideo[] = [];

    for (const source of sources) {
      if (!source.channel_id) {
        console.warn(`Skipping source without channel_id: ${source.source_name}`);
        continue;
      }

      try {
        const upcoming = await fetchSearch(source.channel_id, apiKey, true);
        let ids = (upcoming.items ?? [])
          .map((i) => i.id?.videoId)
          .filter((id): id is string => Boolean(id));
        let fallbackVod = false;

        if (ids.length === 0) {
          const vod = await fetchSearch(source.channel_id, apiKey, false);
          ids = (vod.items ?? [])
            .map((i) => i.id?.videoId)
            .filter((id): id is string => Boolean(id));
          fallbackVod = true;
        }

        const details = await fetchDetails(ids, apiKey);
        collected.push(...toCollected(source, details, fallbackVod));
      } catch (channelErr) {
        console.error(`EPG fetch failed for ${source.source_name}`, channelErr);
      }
    }

    const result = makeProgram(safeDays);
    const byDate = new Map(result.map((d) => [d.date, d]));

    for (const v of collected) {
      const d = new Date(v.scheduledStartTime);
      const dayKey = toDateKey(d);
      const day = byDate.get(dayKey);
      if (!day) continue;
      day.items.push({
        time: toTimeLabel(d),
        title: v.title,
        channelName: v.sourceName,
        thumbnail: v.thumbnail,
        videoId: v.videoId,
        isABJ: v.isABJ,
      });
    }

    const overrides = await readOverrides();
    applyOverrides(result, overrides);

    for (const day of result) {
      day.items.sort((a, b) => a.time.localeCompare(b.time));
    }

    return result;
  } catch (err) {
    console.error("buildEPG failed", err);
    return empty;
  }
}

export async function buildEPG(days: number = 7): Promise<DayProgram[]> {
  const buildEPGCached = unstable_cache(
    async () => buildEPGInternal(days),
    ["build-epg-v2", String(days)],
    { revalidate: 1800 }
  );
  return buildEPGCached();
}

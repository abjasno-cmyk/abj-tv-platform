import "server-only";

import fs from "node:fs/promises";
import path from "node:path";
import { unstable_cache } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CachedVideo, DayProgram, ProgramItem, ProgramOverrideItem } from "@/lib/epg-types";

const PRAGUE_TIMEZONE = "Europe/Prague";
type VideoCacheRow = CachedVideo;

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

function buildFromCache(days: DayProgram[], videos: VideoCacheRow[]): DayProgram[] {
  const byDate = new Map(days.map((d) => [d.date, d]));

  for (const video of videos) {
    const sourceDate = video.scheduled_start_at ?? video.published_at;
    if (!sourceDate) continue;

    const parsed = new Date(sourceDate);
    if (Number.isNaN(parsed.getTime())) continue;

    const dayKey = toDateKey(parsed);
    const day = byDate.get(dayKey);
    if (!day) continue;

    day.items.push({
      time: toTimeLabel(parsed),
      title: video.title,
      channelName: video.channel_name,
      thumbnail: video.thumbnail,
      videoId: video.video_id,
      isABJ: video.is_abj,
      type: video.video_type ?? "vod",
    });
  }

  return days;
}

async function buildEPGInternal(days: number): Promise<DayProgram[]> {
  const safeDays = Math.max(1, Math.min(days, 14));
  const empty = makeProgram(safeDays);

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("videos")
      .select(
        "id, source_id, channel_id, video_id, title, thumbnail, published_at, scheduled_start_at, video_type, channel_name, is_abj, created_at"
      )
      .order("published_at", { ascending: false })
      .limit(500);

    if (error) throw new Error(`Failed to load cached videos: ${error.message}`);

    const cachedVideos = (data ?? []) as VideoCacheRow[];
    const result = buildFromCache(makeProgram(safeDays), cachedVideos);

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
  // YOUTUBE_API_KEY intentionally checked for operational visibility,
  // even though V3 runtime reads from DB cache only.
  const keySet = Boolean(process.env.YOUTUBE_API_KEY);
  if (!keySet) {
    console.warn("YOUTUBE_API_KEY not set — EPG disabled");
  }
  const buildEPGCached = unstable_cache(
    async () => buildEPGInternal(days),
    ["build-epg-v2", String(days)],
    { revalidate: 1800 }
  );
  return buildEPGCached();
}

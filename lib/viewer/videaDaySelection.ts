import type { FeedVideo } from "@/lib/dayOverview";

const PRAGUE_TIMEZONE = "Europe/Prague";
const DAY_MS = 24 * 60 * 60 * 1000;

function toPragueDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: PRAGUE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const byType = parts.reduce<Record<string, string>>((acc, part) => {
    if (part.type !== "literal") acc[part.type] = part.value;
    return acc;
  }, {});

  return `${byType.year}-${byType.month}-${byType.day}`;
}

function parseTimestamp(value: string): number {
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : NaN;
}

/**
 * /videa má zobrazovat kompletní denní přehled:
 * - všechna videa z dneška (Praha)
 * - všechna videa ze včerejška (Praha)
 */
export function selectVideaVideosForTodayAndYesterday(
  videos: FeedVideo[],
  now: Date = new Date(),
): FeedVideo[] {
  const todayKey = toPragueDateKey(now);
  const yesterdayKey = toPragueDateKey(new Date(now.getTime() - DAY_MS));
  const allowedDayKeys = new Set([todayKey, yesterdayKey]);

  const byVideoId = new Map<string, FeedVideo>();
  for (const video of videos) {
    const ts = parseTimestamp(video.published_at);
    if (!Number.isFinite(ts)) continue;
    if (!allowedDayKeys.has(toPragueDateKey(new Date(ts)))) continue;

    const existing = byVideoId.get(video.video_id);
    if (!existing) {
      byVideoId.set(video.video_id, video);
      continue;
    }

    const existingTs = parseTimestamp(existing.published_at);
    if (ts > existingTs) {
      byVideoId.set(video.video_id, video);
    }
  }

  return [...byVideoId.values()].sort(
    (a, b) => parseTimestamp(b.published_at) - parseTimestamp(a.published_at),
  );
}

import { filterNonShortVideos, type ShortDetectionInput } from "@/lib/youtubeShort";

/** How many recent non-short videos to show in the /live KANÁLY detail panel. */
export const LIVE_CHANNEL_VIDEO_DISPLAY_LIMIT = 24;

/** Fetch extra candidates before filtering Shorts out (RSS/API). */
export const LIVE_CHANNEL_VIDEO_FETCH_BUFFER = 72;

/** Lookback window for the standalone /kanaly page. */
export const CHANNEL_VIDEO_LOOKBACK_DAYS = 7;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type ChannelVideoCandidate = ShortDetectionInput & {
  videoId: string;
  title: string;
  thumbnail: string | null;
  publishedAt: string;
};

export function selectLatestNonShortChannelVideos<T extends ChannelVideoCandidate>(
  videos: T[],
  displayLimit: number = LIVE_CHANNEL_VIDEO_DISPLAY_LIMIT,
): T[] {
  return filterNonShortVideos(videos).slice(0, Math.max(1, displayLimit));
}

export function filterChannelVideosWithinDays<T extends { publishedAt: string }>(
  videos: T[],
  days: number = CHANNEL_VIDEO_LOOKBACK_DAYS,
  nowMs: number = Date.now(),
): T[] {
  const cutoff = nowMs - days * MS_PER_DAY;
  return videos.filter((video) => {
    const ts = new Date(video.publishedAt).getTime();
    return Number.isFinite(ts) && ts >= cutoff;
  });
}

export type KanalyChannelVideoSelection<T extends ChannelVideoCandidate> = {
  videos: T[];
  /** True when nothing was published in the lookback window and older videos are shown. */
  usedLatestFallback: boolean;
};

/** Prefer videos from the last N days; otherwise fall back to latest (same as /live). */
function sortVideosNewestFirst<T extends { publishedAt: string }>(videos: T[]): T[] {
  return [...videos].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
}

export function selectKanalyChannelVideos<T extends ChannelVideoCandidate>(
  videos: T[],
  nowMs: number = Date.now(),
): KanalyChannelVideoSelection<T> {
  const sorted = sortVideosNewestFirst(videos);
  const nonShort = selectLatestNonShortChannelVideos(sorted, LIVE_CHANNEL_VIDEO_FETCH_BUFFER);
  const candidates = nonShort.length > 0 ? nonShort : sorted.slice(0, LIVE_CHANNEL_VIDEO_FETCH_BUFFER);
  const recent = filterChannelVideosWithinDays(candidates, CHANNEL_VIDEO_LOOKBACK_DAYS, nowMs);
  if (recent.length > 0) {
    return { videos: recent.slice(0, LIVE_CHANNEL_VIDEO_DISPLAY_LIMIT), usedLatestFallback: false };
  }

  const latest = candidates.slice(0, LIVE_CHANNEL_VIDEO_DISPLAY_LIMIT);
  return { videos: latest, usedLatestFallback: latest.length > 0 };
}

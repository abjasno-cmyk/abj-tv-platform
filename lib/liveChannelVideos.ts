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

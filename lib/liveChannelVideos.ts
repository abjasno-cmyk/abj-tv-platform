import { filterNonShortVideos, type ShortDetectionInput } from "@/lib/youtubeShort";

/** How many recent non-short videos to show in the /live KANÁLY detail panel. */
export const LIVE_CHANNEL_VIDEO_DISPLAY_LIMIT = 12;

/** Fetch extra candidates before filtering Shorts out (RSS/API). */
export const LIVE_CHANNEL_VIDEO_FETCH_BUFFER = 36;

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

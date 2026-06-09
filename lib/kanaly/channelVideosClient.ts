import type { LiveChannelGroup, LiveChannelVideo } from "@/components/abj/ChannelDirectory";
import {
  CHANNEL_VIDEO_LOOKBACK_DAYS,
  LIVE_CHANNEL_VIDEO_FETCH_BUFFER,
  filterChannelVideosWithinDays,
  selectLatestNonShortChannelVideos,
} from "@/lib/liveChannelVideos";

type ChannelLatestApiResponse = {
  videos?: Array<{
    videoId?: string;
    title?: string;
    thumbnail?: string;
    publishedAt?: string;
  }>;
  error?: string;
};

function mapApiVideos(
  payload: ChannelLatestApiResponse,
): LiveChannelVideo[] {
  return (payload.videos ?? [])
    .map((video): LiveChannelVideo | null => {
      const videoId = video.videoId?.trim();
      const title = video.title?.trim();
      if (!videoId || !title) return null;
      return {
        videoId,
        title,
        thumbnail: video.thumbnail?.trim() || null,
        publishedAt: video.publishedAt?.trim() || new Date(0).toISOString(),
      };
    })
    .filter((video): video is LiveChannelVideo => Boolean(video));
}

function withinLookback(videos: LiveChannelVideo[]): LiveChannelVideo[] {
  return filterChannelVideosWithinDays(
    selectLatestNonShortChannelVideos(videos, LIVE_CHANNEL_VIDEO_FETCH_BUFFER),
    CHANNEL_VIDEO_LOOKBACK_DAYS,
  );
}

export async function fetchChannelVideosForKanaly(
  channel: LiveChannelGroup,
): Promise<LiveChannelVideo[]> {
  const preloaded = withinLookback(channel.videos);
  if (preloaded.length > 0) return preloaded;

  if (!channel.channelId && !channel.channelUrl && !channel.channelName.trim()) {
    return [];
  }

  const params = new URLSearchParams();
  if (channel.channelId) params.set("channelId", channel.channelId);
  if (channel.channelUrl) params.set("channelUrl", channel.channelUrl);
  params.set("channelName", channel.channelName);
  params.set("limit", String(LIVE_CHANNEL_VIDEO_FETCH_BUFFER));

  const response = await fetch(`/api/channel-latest?${params.toString()}`, { cache: "no-store" });
  const payload = (await response.json().catch(() => ({}))) as ChannelLatestApiResponse;
  if (!response.ok) {
    throw new Error(payload.error ?? `HTTP ${response.status}`);
  }

  return withinLookback(mapApiVideos(payload));
}

import type { LiveChannelGroup, LiveChannelVideo } from "@/components/abj/ChannelDirectory";
import {
  LIVE_CHANNEL_VIDEO_FETCH_BUFFER,
  selectKanalyChannelVideos,
  type KanalyChannelVideoSelection,
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

export type KanalyChannelVideosResult = KanalyChannelVideoSelection<LiveChannelVideo>;

function mapApiVideos(payload: ChannelLatestApiResponse): LiveChannelVideo[] {
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

async function fetchFromChannelLatest(channel: LiveChannelGroup): Promise<LiveChannelVideo[]> {
  if (!channel.channelId && !channel.channelUrl && !channel.channelName.trim()) {
    return [];
  }

  const params = new URLSearchParams();
  if (channel.channelUrl) {
    params.set("channelUrl", channel.channelUrl);
  } else if (channel.channelId) {
    params.set("channelId", channel.channelId);
  }
  params.set("channelName", channel.channelName);
  params.set("limit", String(LIVE_CHANNEL_VIDEO_FETCH_BUFFER));

  const response = await fetch(`/api/channel-latest?${params.toString()}`, { cache: "no-store" });
  const payload = (await response.json().catch(() => ({}))) as ChannelLatestApiResponse;
  if (!response.ok) {
    throw new Error(payload.error ?? `HTTP ${response.status}`);
  }

  return mapApiVideos(payload);
}

export async function fetchChannelVideosForKanaly(
  channel: LiveChannelGroup,
): Promise<KanalyChannelVideosResult> {
  const feedSelection = selectKanalyChannelVideos(channel.videos);
  // Vždy použij cache z feedu, pokud něco máme — i starší než 7 dní (usedLatestFallback).
  // Jinak zbytečně voláme YouTube API a při chybě ID/Shorts zobrazíme prázdný panel.
  if (feedSelection.videos.length > 0) {
    return feedSelection;
  }

  try {
    const apiVideos = await fetchFromChannelLatest(channel);
    const apiSelection = selectKanalyChannelVideos(apiVideos);
    if (apiSelection.videos.length > 0) {
      return apiSelection;
    }
  } catch {
    // Fall back to feed candidates below (e.g. when YouTube fetch fails).
  }

  if (feedSelection.videos.length > 0) {
    return feedSelection;
  }

  return { videos: [], usedLatestFallback: false };
}

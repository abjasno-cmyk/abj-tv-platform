import "server-only";

import { loadStructuredFeedPayload } from "@/lib/dayOverview";
import { createSupabaseAnonServerClient } from "@/lib/supabase/server";
import { resolveVideoThumbnail, resolveVideoTitle } from "@/lib/viewer/videoMetadata";

const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{6,20}$/;

export function isValidYouTubeVideoId(videoId: string): boolean {
  return YOUTUBE_VIDEO_ID_PATTERN.test(videoId.trim());
}

export type VideoPageMeta = {
  videoId: string;
  title: string;
  channelName: string;
  thumbnailUrl: string;
};

async function loadVideoMetaFromFeed(videoId: string): Promise<{
  title: string | null;
  channelName: string | null;
  thumbnail: string | null;
}> {
  try {
    const payload = await loadStructuredFeedPayload();
    const candidates = [
      ...payload.top,
      ...Object.values(payload.topics).flat(),
      ...Object.values(payload.channels).flat(),
    ];
    const match = candidates.find((video) => video.video_id === videoId);
    if (!match) return { title: null, channelName: null, thumbnail: null };
    return {
      title: match.title?.trim() || null,
      channelName: match.channel?.trim() || null,
      thumbnail: match.thumbnail?.trim() || null,
    };
  } catch {
    return { title: null, channelName: null, thumbnail: null };
  }
}

export async function loadVideoPageMeta(
  videoId: string,
  fallback?: { title?: string | null; channelName?: string | null },
): Promise<VideoPageMeta> {
  const trimmedId = videoId.trim();
  let title = fallback?.title?.trim() ?? "";
  let channelName = fallback?.channelName?.trim() ?? "";
  let thumbnail: string | null = null;

  try {
    const supabase = createSupabaseAnonServerClient();
    const { data } = await supabase
      .from("videos")
      .select("video_id, title, thumbnail, channel_name")
      .eq("video_id", trimmedId)
      .maybeSingle();

    if (data) {
      const row = data as {
        title?: string | null;
        thumbnail?: string | null;
        channel_name?: string | null;
      };
      if (!title) title = row.title?.trim() ?? "";
      if (!channelName) channelName = row.channel_name?.trim() ?? "";
      thumbnail = row.thumbnail?.trim() ?? null;
    }
  } catch {
    // Feed without videos table — fall back to URL params only.
  }

  if (!title || !channelName || !thumbnail) {
    const feedMeta = await loadVideoMetaFromFeed(trimmedId);
    if (!title) title = feedMeta.title ?? "";
    if (!channelName) channelName = feedMeta.channelName ?? "";
    if (!thumbnail) thumbnail = feedMeta.thumbnail;
  }

  return {
    videoId: trimmedId,
    title: resolveVideoTitle(trimmedId, title),
    channelName,
    thumbnailUrl: resolveVideoThumbnail(trimmedId, thumbnail),
  };
}

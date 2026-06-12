import "server-only";

import { createSupabaseAnonServerClient } from "@/lib/supabase/server";
import { buildVideoSlug } from "@/lib/seo/slug";
import { resolveVideoThumbnail, resolveVideoTitle } from "@/lib/viewer/videoMetadata";
import { isValidYouTubeVideoId } from "@/lib/viewer/videoPageServer";

type VideoRow = {
  video_id: string;
  title: string | null;
  thumbnail: string | null;
  channel_name: string | null;
  published_at: string | null;
  scheduled_start_at: string | null;
  duration_min: number | null;
  metadata: unknown;
};

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readTopics(metadata: unknown): string[] {
  const root = asObject(metadata);
  if (!root) return [];
  const raw = root.topics;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function resolvePublishedAt(row: VideoRow): string | null {
  return row.published_at ?? row.scheduled_start_at ?? null;
}

function resolveDescription(metadata: unknown, title: string): string {
  const root = asObject(metadata);
  return readString(root?.tldr) ?? readString(root?.context) ?? readString(root?.summary) ?? title;
}

export type VideoSeoRecord = {
  videoId: string;
  title: string;
  channelName: string;
  thumbnailUrl: string;
  publishedAt: string | null;
  description: string;
  topics: string[];
  durationMin: number | null;
  slug: string | null;
  youtubeUrl: string;
  playerPath: string;
};

export type RelatedVideoSeo = {
  videoId: string;
  title: string;
  channelName: string;
  thumbnailUrl: string;
  slug: string | null;
  publishedAt: string | null;
};

function mapRowToSeoRecord(row: VideoRow): VideoSeoRecord | null {
  const videoId = row.video_id.trim();
  if (!isValidYouTubeVideoId(videoId)) return null;

  const title = resolveVideoTitle(videoId, row.title);
  const channelName = row.channel_name?.trim() ?? "";
  const publishedAt = resolvePublishedAt(row);
  const slug = buildVideoSlug({ title, publishedAt, videoId });

  return {
    videoId,
    title,
    channelName,
    thumbnailUrl: resolveVideoThumbnail(videoId, row.thumbnail),
    publishedAt,
    description: resolveDescription(row.metadata, title),
    topics: readTopics(row.metadata),
    durationMin: typeof row.duration_min === "number" ? row.duration_min : null,
    slug,
    youtubeUrl: `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`,
    playerPath: `/videa/${encodeURIComponent(videoId)}`,
  };
}

export async function loadVideoSeoRecord(videoId: string): Promise<VideoSeoRecord | null> {
  const trimmedId = videoId.trim();
  if (!isValidYouTubeVideoId(trimmedId)) return null;

  try {
    const supabase = createSupabaseAnonServerClient();
    const { data } = await supabase
      .from("videos")
      .select("video_id, title, thumbnail, channel_name, published_at, scheduled_start_at, duration_min, metadata")
      .eq("video_id", trimmedId)
      .maybeSingle();

    if (!data) return null;
    return mapRowToSeoRecord(data as VideoRow);
  } catch {
    return null;
  }
}

export async function loadRelatedChannelVideos(
  channelName: string,
  excludeVideoId: string,
  limit = 6,
): Promise<RelatedVideoSeo[]> {
  const normalizedChannel = channelName.trim();
  if (!normalizedChannel) return [];

  try {
    const supabase = createSupabaseAnonServerClient();
    const { data } = await supabase
      .from("videos")
      .select("video_id, title, thumbnail, channel_name, published_at, scheduled_start_at")
      .eq("channel_name", normalizedChannel)
      .neq("video_id", excludeVideoId)
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(limit);

    if (!Array.isArray(data)) return [];

    return data
      .map((row) => {
        const typed = row as VideoRow;
        const videoId = typed.video_id.trim();
        if (!isValidYouTubeVideoId(videoId)) return null;
        const title = resolveVideoTitle(videoId, typed.title);
        const publishedAt = resolvePublishedAt(typed);
        return {
          videoId,
          title,
          channelName: typed.channel_name?.trim() ?? normalizedChannel,
          thumbnailUrl: resolveVideoThumbnail(videoId, typed.thumbnail),
          slug: buildVideoSlug({ title, publishedAt, videoId }),
          publishedAt,
        } satisfies RelatedVideoSeo;
      })
      .filter((item): item is RelatedVideoSeo => item !== null);
  } catch {
    return [];
  }
}

export async function listVideosForSitemap(limit = 500): Promise<VideoSeoRecord[]> {
  try {
    const supabase = createSupabaseAnonServerClient();
    const { data } = await supabase
      .from("videos")
      .select("video_id, title, thumbnail, channel_name, published_at, scheduled_start_at, duration_min, metadata")
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(limit);

    if (!Array.isArray(data)) return [];

    return data
      .map((row) => mapRowToSeoRecord(row as VideoRow))
      .filter((item): item is VideoSeoRecord => item !== null && Boolean(item.slug));
  } catch {
    return [];
  }
}

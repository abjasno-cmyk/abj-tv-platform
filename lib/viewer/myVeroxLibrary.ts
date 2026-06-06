import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { LiveChannelGroup } from "@/components/abj/ChannelDirectory";
import { loadLiveChannelsForPage } from "@/lib/liveChannelsServer";
import {
  liveVideoHref,
  normalizeChannelFollowId,
  resolveVideoThumbnail,
  resolveVideoTitle,
  type ViewerVideoMeta,
} from "@/lib/viewer/videoMetadata";

export type ViewerLibraryVideo = ViewerVideoMeta & {
  savedAt?: string | null;
  lastWatchedAt?: string | null;
  progressPercent?: number | null;
  completed?: boolean;
  href: string;
};

export type ViewerLibraryChannel = {
  channelId: string;
  channelName: string;
  avatarUrl: string | null;
  followedAt: string;
  href: string;
};

export type ViewerLibraryOpinion = {
  articleId: string;
  title: string;
  slug: string;
  heroImagePath: string | null;
  authorName: string | null;
  savedAt: string;
  href: string;
};

export type MyVeroxLibraryPayload = {
  savedVideos: ViewerLibraryVideo[];
  savedOpinions: ViewerLibraryOpinion[];
  watchedVideos: ViewerLibraryVideo[];
  continueWatching: ViewerLibraryVideo[];
  followedChannels: ViewerLibraryChannel[];
};

export type SavedVideoRow = {
  video_id: string;
  title: string | null;
  thumbnail_url: string | null;
  channel_name: string | null;
  created_at: string;
};

export type VideoProgressRow = {
  video_id: string;
  title: string | null;
  thumbnail_url: string | null;
  channel_name: string | null;
  progress_percent: number | null;
  completed: boolean;
  last_watched_at: string;
};

export type FollowRow = {
  channel_id: string;
  created_at: string;
};

export type SavedOpinionRow = {
  article_id: string;
  title: string | null;
  slug: string | null;
  hero_image_path: string | null;
  author_name: string | null;
  created_at: string;
};

function mapSavedRow(row: SavedVideoRow): ViewerLibraryVideo {
  const title = resolveVideoTitle(row.video_id, row.title);
  return {
    videoId: row.video_id,
    title,
    thumbnailUrl: resolveVideoThumbnail(row.video_id, row.thumbnail_url),
    channelName: row.channel_name?.trim() || null,
    savedAt: row.created_at,
    href: liveVideoHref({
      videoId: row.video_id,
      title,
      channelName: row.channel_name,
    }),
  };
}

function mapProgressRow(row: VideoProgressRow): ViewerLibraryVideo {
  const title = resolveVideoTitle(row.video_id, row.title);
  return {
    videoId: row.video_id,
    title,
    thumbnailUrl: resolveVideoThumbnail(row.video_id, row.thumbnail_url),
    channelName: row.channel_name?.trim() || null,
    lastWatchedAt: row.last_watched_at,
    progressPercent: row.progress_percent,
    completed: row.completed,
    href: liveVideoHref({
      videoId: row.video_id,
      title,
      channelName: row.channel_name,
    }),
  };
}

function resolveChannelFromCatalog(channelId: string, catalog: LiveChannelGroup[]): LiveChannelGroup | null {
  const direct = catalog.find((channel) => channel.channelId === channelId);
  if (direct) return direct;

  const sourceMatch = channelId.match(/^source:(.+)$/);
  if (sourceMatch) {
    const key = sourceMatch[1];
    return (
      catalog.find(
        (channel) =>
          normalizeChannelFollowId(channel.channelId, channel.channelName) === channelId ||
          channel.channelName
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "-") === key,
      ) ?? null
    );
  }

  return null;
}

function mapSavedOpinionRow(row: SavedOpinionRow): ViewerLibraryOpinion {
  const slug = row.slug?.trim() || "";
  return {
    articleId: row.article_id,
    title: row.title?.trim() || "Článek Názorů",
    slug,
    heroImagePath: row.hero_image_path,
    authorName: row.author_name?.trim() || null,
    savedAt: row.created_at,
    href: slug ? `/nazory/${slug}` : "/nazory",
  };
}

export function buildMyVeroxLibraryFromRows(input: {
  savedRows: SavedVideoRow[];
  savedOpinionRows?: SavedOpinionRow[];
  progressRows: VideoProgressRow[];
  followRows: FollowRow[];
  catalog: LiveChannelGroup[];
}): MyVeroxLibraryPayload {
  const savedVideos = input.savedRows.map(mapSavedRow);
  const savedOpinions = (input.savedOpinionRows ?? []).map(mapSavedOpinionRow);
  const watchedVideos = input.progressRows.filter((row) => row.completed).map(mapProgressRow);
  const continueWatching = input.progressRows
    .filter((row) => !row.completed && (row.progress_percent ?? 0) >= 2)
    .map(mapProgressRow);

  const followedChannels = input.followRows.map((row) => {
    const matched = resolveChannelFromCatalog(row.channel_id, input.catalog);
    const channelName = matched?.channelName ?? row.channel_id.replace(/^source:/, "").replace(/-/g, " ");
    return {
      channelId: row.channel_id,
      channelName,
      avatarUrl: matched?.avatarUrl ?? null,
      followedAt: row.created_at,
      href: "/live#hf-channels",
    } satisfies ViewerLibraryChannel;
  });

  return {
    savedVideos,
    savedOpinions,
    watchedVideos,
    continueWatching,
    followedChannels,
  };
}

export async function loadMyVeroxLibraryForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<MyVeroxLibraryPayload> {
  const [savedRes, savedOpinionsRes, progressRes, followsRes, catalog] = await Promise.all([
    supabase
      .from("saved_videos")
      .select("video_id, title, thumbnail_url, channel_name, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("saved_opinion_articles")
      .select("article_id, title, slug, hero_image_path, author_name, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("video_progress")
      .select(
        "video_id, title, thumbnail_url, channel_name, progress_percent, completed, last_watched_at",
      )
      .eq("user_id", userId)
      .order("last_watched_at", { ascending: false }),
    supabase
      .from("follows")
      .select("channel_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    loadLiveChannelsForPage().catch(() => [] as LiveChannelGroup[]),
  ]);

  if (savedRes.error || progressRes.error || followsRes.error) {
    throw new Error("Nepodařilo se načíst osobní knihovnu.");
  }

  return buildMyVeroxLibraryFromRows({
    savedRows: (savedRes.data ?? []) as SavedVideoRow[],
    savedOpinionRows: savedOpinionsRes.error
      ? []
      : ((savedOpinionsRes.data ?? []) as SavedOpinionRow[]),
    progressRows: (progressRes.data ?? []) as VideoProgressRow[],
    followRows: (followsRes.data ?? []) as FollowRow[],
    catalog,
  });
}

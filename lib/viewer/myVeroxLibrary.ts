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

export type ViewerLibraryNovinyArticle = {
  articleId: string;
  title: string;
  sourceName: string | null;
  originalUrl: string;
  imageUrl: string | null;
  publishedAt: string | null;
  savedAt: string;
  href: string;
};

export type MyVeroxLibraryPayload = {
  savedVideos: ViewerLibraryVideo[];
  savedOpinions: ViewerLibraryOpinion[];
  savedNovinyArticles: ViewerLibraryNovinyArticle[];
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

export type SavedNovinyArticleRow = {
  article_id: string;
  title: string | null;
  source_name: string | null;
  original_url: string | null;
  image_url: string | null;
  published_at: string | null;
  created_at: string;
};

function mapSavedRow(row: SavedVideoRow, catalogTitles: Map<string, string>): ViewerLibraryVideo {
  const title = resolveVideoTitle(row.video_id, row.title, catalogTitles.get(row.video_id));
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

function mapProgressRow(row: VideoProgressRow, catalogTitles: Map<string, string>): ViewerLibraryVideo {
  const title = resolveVideoTitle(row.video_id, row.title, catalogTitles.get(row.video_id));
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

function mapSavedNovinyArticleRow(row: SavedNovinyArticleRow): ViewerLibraryNovinyArticle {
  return {
    articleId: row.article_id,
    title: row.title?.trim() || "Článek Novin",
    sourceName: row.source_name?.trim() || null,
    originalUrl: row.original_url?.trim() || "",
    imageUrl: row.image_url?.trim() || null,
    publishedAt: row.published_at,
    savedAt: row.created_at,
    href: `/noviny#noviny-article-${row.article_id}`,
  };
}

async function loadCatalogVideoTitles(
  supabase: SupabaseClient,
  videoIds: string[],
): Promise<Map<string, string>> {
  const unique = Array.from(new Set(videoIds.filter(Boolean)));
  if (unique.length === 0) return new Map();

  const { data } = await supabase.from("videos").select("video_id, title").in("video_id", unique);
  const map = new Map<string, string>();
  for (const row of (data ?? []) as Array<{ video_id: string; title: string | null }>) {
    const title = row.title?.trim();
    if (title) map.set(row.video_id, title);
  }
  return map;
}

export function buildMyVeroxLibraryFromRows(input: {
  savedRows: SavedVideoRow[];
  savedOpinionRows?: SavedOpinionRow[];
  savedNovinyArticleRows?: SavedNovinyArticleRow[];
  progressRows: VideoProgressRow[];
  followRows: FollowRow[];
  catalog: LiveChannelGroup[];
  catalogTitles?: Map<string, string>;
}): MyVeroxLibraryPayload {
  const catalogTitles = input.catalogTitles ?? new Map<string, string>();
  const savedVideos = input.savedRows.map((row) => mapSavedRow(row, catalogTitles));
  const savedOpinions = (input.savedOpinionRows ?? []).map(mapSavedOpinionRow);
  const savedNovinyArticles = (input.savedNovinyArticleRows ?? []).map(mapSavedNovinyArticleRow);
  const watchedVideos = input.progressRows
    .filter((row) => row.completed)
    .map((row) => mapProgressRow(row, catalogTitles));
  const continueWatching = input.progressRows
    .filter((row) => !row.completed && (row.progress_percent ?? 0) >= 2)
    .map((row) => mapProgressRow(row, catalogTitles));

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
    savedNovinyArticles,
    watchedVideos,
    continueWatching,
    followedChannels,
  };
}

export async function loadMyVeroxLibraryForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<MyVeroxLibraryPayload> {
  const [savedRes, savedOpinionsRes, savedNovinyRes, progressRes, followsRes, catalog] = await Promise.all([
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
      .from("saved_noviny_articles")
      .select("article_id, title, source_name, original_url, image_url, published_at, created_at")
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

  const savedRows = (savedRes.data ?? []) as SavedVideoRow[];
  const progressRows = (progressRes.data ?? []) as VideoProgressRow[];
  const videoIds = [
    ...savedRows.map((row) => row.video_id),
    ...progressRows.map((row) => row.video_id),
  ];
  const catalogTitles = await loadCatalogVideoTitles(supabase, videoIds);

  return buildMyVeroxLibraryFromRows({
    savedRows,
    savedOpinionRows: savedOpinionsRes.error
      ? []
      : ((savedOpinionsRes.data ?? []) as SavedOpinionRow[]),
    savedNovinyArticleRows: savedNovinyRes.error
      ? []
      : ((savedNovinyRes.data ?? []) as SavedNovinyArticleRow[]),
    progressRows,
    followRows: (followsRes.data ?? []) as FollowRow[],
    catalog,
    catalogTitles,
  });
}

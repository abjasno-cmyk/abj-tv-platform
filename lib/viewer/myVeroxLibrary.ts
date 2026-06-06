import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { LiveChannelGroup } from "@/components/abj/ChannelDirectory";
import { loadStructuredFeedPayload } from "@/lib/dayOverview";
import { loadLiveChannelsForPage } from "@/lib/liveChannelsServer";
import {
  collectVideoIdsNeedingTitleHydration,
  hydrateVideoMetadataLookup,
  type VideoMetaLookup,
} from "@/lib/viewer/hydrateVideoMetadata";
import {
  isPlaceholderVideoTitle,
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

export type MyVeroxLibraryPayload = {
  savedVideos: ViewerLibraryVideo[];
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

function resolveRowMetadata(
  row: Pick<SavedVideoRow, "video_id" | "title" | "thumbnail_url" | "channel_name">,
  lookup?: VideoMetaLookup,
) {
  const hydrated = lookup?.get(row.video_id);
  const title = resolveVideoTitle(row.video_id, hydrated?.title ?? row.title);
  const thumbnailUrl = resolveVideoThumbnail(row.video_id, hydrated?.thumbnailUrl ?? row.thumbnail_url);
  const channelName = hydrated?.channelName?.trim() || row.channel_name?.trim() || null;
  return { title, thumbnailUrl, channelName };
}

function mapSavedRow(row: SavedVideoRow, lookup?: VideoMetaLookup): ViewerLibraryVideo {
  const { title, thumbnailUrl, channelName } = resolveRowMetadata(row, lookup);
  return {
    videoId: row.video_id,
    title,
    thumbnailUrl,
    channelName,
    savedAt: row.created_at,
    href: liveVideoHref({
      videoId: row.video_id,
      title,
      channelName,
    }),
  };
}

function mapProgressRow(row: VideoProgressRow, lookup?: VideoMetaLookup): ViewerLibraryVideo {
  const { title, thumbnailUrl, channelName } = resolveRowMetadata(row, lookup);
  return {
    videoId: row.video_id,
    title,
    thumbnailUrl,
    channelName,
    lastWatchedAt: row.last_watched_at,
    progressPercent: row.progress_percent,
    completed: row.completed,
    href: liveVideoHref({
      videoId: row.video_id,
      title,
      channelName,
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

export function buildMyVeroxLibraryFromRows(input: {
  savedRows: SavedVideoRow[];
  progressRows: VideoProgressRow[];
  followRows: FollowRow[];
  catalog: LiveChannelGroup[];
  metadataLookup?: VideoMetaLookup;
}): MyVeroxLibraryPayload {
  const savedVideos = input.savedRows.map((row) => mapSavedRow(row, input.metadataLookup));
  const watchedVideos = input.progressRows
    .filter((row) => row.completed)
    .map((row) => mapProgressRow(row, input.metadataLookup));
  const continueWatching = input.progressRows
    .filter((row) => !row.completed && (row.progress_percent ?? 0) >= 2)
    .map((row) => mapProgressRow(row, input.metadataLookup));

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
    watchedVideos,
    continueWatching,
    followedChannels,
  };
}

function buildMetadataBackfillPatch(
  row: Pick<SavedVideoRow, "video_id" | "title" | "thumbnail_url" | "channel_name">,
  lookup: VideoMetaLookup,
): { title: string; thumbnail_url?: string; channel_name?: string } | null {
  const hydrated = lookup.get(row.video_id);
  if (!hydrated?.title || isPlaceholderVideoTitle(row.video_id, hydrated.title)) return null;

  const patch: { title: string; thumbnail_url?: string; channel_name?: string } = {
    title: hydrated.title,
  };
  if (hydrated.thumbnailUrl && !row.thumbnail_url?.trim()) {
    patch.thumbnail_url = hydrated.thumbnailUrl;
  }
  if (hydrated.channelName && !row.channel_name?.trim()) {
    patch.channel_name = hydrated.channelName;
  }

  const needsTitle = isPlaceholderVideoTitle(row.video_id, row.title);
  const needsThumbnail = !row.thumbnail_url?.trim() && Boolean(patch.thumbnail_url);
  const needsChannel = !row.channel_name?.trim() && Boolean(patch.channel_name);
  if (!needsTitle && !needsThumbnail && !needsChannel) return null;

  return patch;
}

async function backfillHydratedVideoMetadata(
  supabase: SupabaseClient,
  userId: string,
  savedRows: SavedVideoRow[],
  progressRows: VideoProgressRow[],
  lookup: VideoMetaLookup,
): Promise<void> {
  await Promise.all([
    ...savedRows.map(async (row) => {
      const patch = buildMetadataBackfillPatch(row, lookup);
      if (!patch) return;
      await supabase.from("saved_videos").update(patch).eq("user_id", userId).eq("video_id", row.video_id);
    }),
    ...progressRows.map(async (row) => {
      const patch = buildMetadataBackfillPatch(row, lookup);
      if (!patch) return;
      await supabase.from("video_progress").update(patch).eq("user_id", userId).eq("video_id", row.video_id);
    }),
  ]);
}

export async function loadMyVeroxLibraryForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<MyVeroxLibraryPayload> {
  const [savedRes, progressRes, followsRes, catalog, feed] = await Promise.all([
    supabase
      .from("saved_videos")
      .select("video_id, title, thumbnail_url, channel_name, created_at")
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
    loadStructuredFeedPayload().catch(() => null),
  ]);

  if (savedRes.error || progressRes.error || followsRes.error) {
    throw new Error("Nepodařilo se načíst osobní knihovnu.");
  }

  const savedRows = (savedRes.data ?? []) as SavedVideoRow[];
  const progressRows = (progressRes.data ?? []) as VideoProgressRow[];
  const videoIdsNeedingHydration = collectVideoIdsNeedingTitleHydration([...savedRows, ...progressRows]);
  const metadataLookup = await hydrateVideoMetadataLookup({
    supabase,
    videoIds: videoIdsNeedingHydration,
    catalog,
    feed,
  });

  await backfillHydratedVideoMetadata(supabase, userId, savedRows, progressRows, metadataLookup).catch(() => {
    // Backfill is best-effort; the response still uses hydrated metadata.
  });

  return buildMyVeroxLibraryFromRows({
    savedRows,
    progressRows,
    followRows: (followsRes.data ?? []) as FollowRow[],
    catalog,
    metadataLookup,
  });
}

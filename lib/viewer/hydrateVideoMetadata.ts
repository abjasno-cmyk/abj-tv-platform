import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { LiveChannelGroup } from "@/components/abj/ChannelDirectory";
import type { FeedVideo, StructuredFeedPayload } from "@/lib/dayOverview";
import { isPlaceholderVideoTitle } from "@/lib/viewer/videoMetadata";

export type HydratedVideoMeta = {
  title?: string;
  thumbnailUrl?: string;
  channelName?: string;
};

export type VideoMetaLookup = Map<string, HydratedVideoMeta>;

function sanitizeEnvValue(value?: string): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  const equalsIdx = trimmed.indexOf("=");
  const maybeAssigned =
    equalsIdx > 0 && /^[A-Z0-9_]+$/.test(trimmed.slice(0, equalsIdx))
      ? trimmed.slice(equalsIdx + 1).trim()
      : trimmed;
  if (
    (maybeAssigned.startsWith('"') && maybeAssigned.endsWith('"')) ||
    (maybeAssigned.startsWith("'") && maybeAssigned.endsWith("'"))
  ) {
    return maybeAssigned.slice(1, -1).trim();
  }
  return maybeAssigned;
}

function mergeMeta(lookup: VideoMetaLookup, videoId: string, meta: HydratedVideoMeta): void {
  const existing = lookup.get(videoId) ?? {};
  lookup.set(videoId, {
    title: meta.title?.trim() || existing.title,
    thumbnailUrl: meta.thumbnailUrl?.trim() || existing.thumbnailUrl,
    channelName: meta.channelName?.trim() || existing.channelName,
  });
}

function addFeedVideo(lookup: VideoMetaLookup, video: FeedVideo, channelName?: string): void {
  mergeMeta(lookup, video.video_id, {
    title: video.title,
    thumbnailUrl: video.thumbnail,
    channelName: video.channel?.trim() || channelName,
  });
}

export function buildVideoLookupFromCatalog(catalog: LiveChannelGroup[]): VideoMetaLookup {
  const lookup: VideoMetaLookup = new Map();
  for (const channel of catalog) {
    for (const video of channel.videos) {
      mergeMeta(lookup, video.videoId, {
        title: video.title,
        thumbnailUrl: video.thumbnail ?? undefined,
        channelName: channel.channelName,
      });
    }
  }
  return lookup;
}

export function buildVideoLookupFromStructuredFeed(payload: StructuredFeedPayload): VideoMetaLookup {
  const lookup: VideoMetaLookup = new Map();
  for (const video of payload.top) {
    addFeedVideo(lookup, video);
  }
  for (const videos of Object.values(payload.topics)) {
    for (const video of videos) {
      addFeedVideo(lookup, video);
    }
  }
  for (const [channelName, videos] of Object.entries(payload.channels)) {
    for (const video of videos) {
      addFeedVideo(lookup, video, channelName);
    }
  }
  return lookup;
}

export function mergeVideoLookups(...lookups: VideoMetaLookup[]): VideoMetaLookup {
  const merged: VideoMetaLookup = new Map();
  for (const lookup of lookups) {
    for (const [videoId, meta] of lookup) {
      mergeMeta(merged, videoId, meta);
    }
  }
  return merged;
}

export function collectVideoIdsNeedingTitleHydration(
  rows: Array<{ video_id: string; title: string | null }>,
): string[] {
  const ids = new Set<string>();
  for (const row of rows) {
    if (isPlaceholderVideoTitle(row.video_id, row.title)) {
      ids.add(row.video_id);
    }
  }
  return [...ids];
}

function missingTitleIds(videoIds: string[], lookup: VideoMetaLookup): string[] {
  return videoIds.filter((videoId) => !lookup.get(videoId)?.title?.trim());
}

export async function loadVideoLookupFromVideosTable(
  supabase: SupabaseClient,
  videoIds: string[],
): Promise<VideoMetaLookup> {
  if (videoIds.length === 0) return new Map();

  const lookup: VideoMetaLookup = new Map();
  const { data, error } = await supabase
    .from("videos")
    .select("video_id, title, thumbnail, channel_name")
    .in("video_id", videoIds);

  if (error || !data) return lookup;

  for (const row of data as Array<{
    video_id: string;
    title: string | null;
    thumbnail: string | null;
    channel_name: string | null;
  }>) {
    if (!row.video_id) continue;
    mergeMeta(lookup, row.video_id, {
      title: row.title ?? undefined,
      thumbnailUrl: row.thumbnail ?? undefined,
      channelName: row.channel_name ?? undefined,
    });
  }

  return lookup;
}

type YouTubeVideosSnippetPayload = {
  items?: Array<{
    id?: string;
    snippet?: {
      title?: string;
      channelTitle?: string;
      thumbnails?: {
        high?: { url?: string };
        medium?: { url?: string };
        default?: { url?: string };
      };
    };
  }>;
};

export async function fetchVideoLookupFromYouTube(videoIds: string[]): Promise<VideoMetaLookup> {
  const apiKey = sanitizeEnvValue(process.env.YOUTUBE_API_KEY);
  if (!apiKey || videoIds.length === 0) return new Map();

  const lookup: VideoMetaLookup = new Map();
  for (let idx = 0; idx < videoIds.length; idx += 50) {
    const batch = videoIds.slice(idx, idx + 50);
    try {
      const url = new URL("https://www.googleapis.com/youtube/v3/videos");
      url.searchParams.set("part", "snippet");
      url.searchParams.set("id", batch.join(","));
      url.searchParams.set("key", apiKey);

      const response = await fetch(url.toString(), { signal: AbortSignal.timeout(9000) });
      if (!response.ok) continue;

      const payload = (await response.json()) as YouTubeVideosSnippetPayload;
      for (const item of payload.items ?? []) {
        const videoId = item.id?.trim();
        const title = item.snippet?.title?.trim();
        if (!videoId || !title) continue;
        const thumbnails = item.snippet?.thumbnails;
        mergeMeta(lookup, videoId, {
          title,
          thumbnailUrl:
            thumbnails?.high?.url ?? thumbnails?.medium?.url ?? thumbnails?.default?.url ?? undefined,
          channelName: item.snippet?.channelTitle?.trim(),
        });
      }
    } catch {
      // Continue with other batches.
    }
  }

  return lookup;
}

export async function hydrateVideoMetadataLookup(input: {
  supabase: SupabaseClient;
  videoIds: string[];
  catalog: LiveChannelGroup[];
  feed?: StructuredFeedPayload | null;
}): Promise<VideoMetaLookup> {
  const uniqueIds = [...new Set(input.videoIds.filter((videoId) => videoId.trim().length > 0))];
  if (uniqueIds.length === 0) return new Map();

  let lookup = mergeVideoLookups(
    buildVideoLookupFromCatalog(input.catalog),
    input.feed ? buildVideoLookupFromStructuredFeed(input.feed) : new Map(),
  );

  let unresolved = missingTitleIds(uniqueIds, lookup);
  if (unresolved.length > 0) {
    lookup = mergeVideoLookups(lookup, await loadVideoLookupFromVideosTable(input.supabase, unresolved));
    unresolved = missingTitleIds(uniqueIds, lookup);
  }

  if (unresolved.length > 0) {
    lookup = mergeVideoLookups(lookup, await fetchVideoLookupFromYouTube(unresolved));
  }

  return lookup;
}

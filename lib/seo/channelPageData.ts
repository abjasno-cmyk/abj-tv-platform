import "server-only";

import { unstable_cache } from "next/cache";

import {
  buildChannelSlugIndex,
  normalizeChannelLookupKey,
  resolveChannelSlug,
} from "@/lib/seo/channelSlug";
import { buildVideoSlug } from "@/lib/seo/slug";
import { createSupabaseAnonServerClient } from "@/lib/supabase/server";
import { resolveVideoThumbnail, resolveVideoTitle } from "@/lib/viewer/videoMetadata";
import { isValidYouTubeVideoId } from "@/lib/viewer/videoPageServer";

type SourceRow = {
  source_name: string | null;
  channel_id: string | null;
  channel_url: string | null;
};

type VideoRow = {
  video_id: string;
  title: string | null;
  thumbnail: string | null;
  channel_name: string | null;
  published_at: string | null;
  scheduled_start_at: string | null;
};

export type ChannelSourceRecord = {
  channelName: string;
  channelId: string | null;
  channelUrl: string | null;
  avatarUrl: string | null;
};

export type ChannelVideoCard = {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  publishedAt: string | null;
  slug: string | null;
  playerPath: string;
};

export type ChannelSeoRecord = ChannelSourceRecord & {
  slug: string;
  latestPublishedAt: string | null;
  latestVideoTitle: string | null;
  videos: ChannelVideoCard[];
};

function readString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function resolvePublishedAt(row: VideoRow): string | null {
  return row.published_at ?? row.scheduled_start_at ?? null;
}

function fallbackAvatarUrl(channelId: string | null, channelUrl: string | null): string | null {
  if (channelId) {
    return `https://unavatar.io/youtube/${encodeURIComponent(channelId)}`;
  }
  if (!channelUrl) return null;
  try {
    const parsed = new URL(channelUrl);
    const parts = parsed.pathname.split("/").filter(Boolean);
    const first = parts[0];
    if (first?.startsWith("@")) {
      const handle = first.slice(1).trim();
      if (handle) return `https://unavatar.io/youtube/${encodeURIComponent(handle)}`;
    }
    if ((first === "channel" || first === "c" || first === "user") && parts[1]) {
      return `https://unavatar.io/youtube/${encodeURIComponent(parts[1].trim())}`;
    }
  } catch {
    // Ignore malformed URLs.
  }
  return null;
}

function mapVideoRow(row: VideoRow): ChannelVideoCard | null {
  const videoId = row.video_id.trim();
  if (!isValidYouTubeVideoId(videoId)) return null;

  const title = resolveVideoTitle(videoId, row.title);
  const publishedAt = resolvePublishedAt(row);
  const slug = buildVideoSlug({ title, publishedAt, videoId });

  return {
    videoId,
    title,
    thumbnailUrl: resolveVideoThumbnail(videoId, row.thumbnail),
    publishedAt,
    slug,
    playerPath: `/videa/${encodeURIComponent(videoId)}`,
  };
}

async function loadActiveSourceChannels(): Promise<ChannelSourceRecord[]> {
  try {
    const supabase = createSupabaseAnonServerClient();
    const { data, error } = await supabase
      .from("sources")
      .select("source_name, channel_id, channel_url")
      .eq("platform", "youtube")
      .eq("active", true)
      .order("source_name", { ascending: true });

    if (error) {
      console.error("channel-seo-source-query-failed", error.message);
      return [];
    }

    const byKey = new Map<string, ChannelSourceRecord>();
    for (const row of (data ?? []) as SourceRow[]) {
      const channelName = readString(row.source_name);
      if (!channelName) continue;
      const key = normalizeChannelLookupKey(channelName);
      if (!key) continue;

      const nextEntry: ChannelSourceRecord = {
        channelName,
        channelId: readString(row.channel_id),
        channelUrl: readString(row.channel_url),
        avatarUrl: fallbackAvatarUrl(readString(row.channel_id), readString(row.channel_url)),
      };

      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, nextEntry);
        continue;
      }
      if (!existing.channelId && nextEntry.channelId) existing.channelId = nextEntry.channelId;
      if (!existing.channelUrl && nextEntry.channelUrl) existing.channelUrl = nextEntry.channelUrl;
      if (!existing.avatarUrl && nextEntry.avatarUrl) existing.avatarUrl = nextEntry.avatarUrl;
      if (nextEntry.channelName.length > existing.channelName.length) existing.channelName = nextEntry.channelName;
    }

    return [...byKey.values()].sort((a, b) => a.channelName.localeCompare(b.channelName, "cs-CZ"));
  } catch (error) {
    console.error("channel-seo-source-load-failed", error);
    return [];
  }
}

async function loadChannelVideos(channelName: string, limit = 24): Promise<ChannelVideoCard[]> {
  const normalizedChannel = channelName.trim();
  if (!normalizedChannel) return [];

  try {
    const supabase = createSupabaseAnonServerClient();
    const { data } = await supabase
      .from("videos")
      .select("video_id, title, thumbnail, channel_name, published_at, scheduled_start_at")
      .eq("channel_name", normalizedChannel)
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(limit);

    if (!Array.isArray(data)) return [];

    return data
      .map((row) => mapVideoRow(row as VideoRow))
      .filter((item): item is ChannelVideoCard => item !== null);
  } catch {
    return [];
  }
}

type ChannelSlugIndex = {
  slugByChannelName: Record<string, string>;
  channels: ChannelSourceRecord[];
};

async function buildChannelSlugIndexPayload(): Promise<ChannelSlugIndex> {
  const channels = await loadActiveSourceChannels();
  const { slugByChannelName } = buildChannelSlugIndex(channels);
  return {
    channels,
    slugByChannelName: Object.fromEntries(slugByChannelName),
  };
}

const loadCachedChannelSlugIndex = unstable_cache(buildChannelSlugIndexPayload, ["seo-channel-slug-index"], {
  revalidate: 3600,
  tags: ["seo-channels"],
});

export async function listChannelsForSitemap(): Promise<Array<{ slug: string; channelName: string }>> {
  const payload = await loadCachedChannelSlugIndex();
  const { channelBySlug } = buildChannelSlugIndex(payload.channels);
  return [...channelBySlug.entries()].map(([slug, channel]) => ({
    slug,
    channelName: channel.channelName,
  }));
}

export async function loadChannelSeoRecord(slug: string): Promise<ChannelSeoRecord | null> {
  const trimmedSlug = slug.trim();
  if (!trimmedSlug) return null;

  const payload = await loadCachedChannelSlugIndex();
  const { channelBySlug } = buildChannelSlugIndex(payload.channels);
  const source = channelBySlug.get(trimmedSlug);
  if (!source) return null;

  const videos = await loadChannelVideos(source.channelName, 24);
  const latest = videos[0] ?? null;

  return {
    ...source,
    slug: trimmedSlug,
    latestPublishedAt: latest?.publishedAt ?? null,
    latestVideoTitle: latest?.title ?? null,
    videos,
  };
}

export async function resolveChannelSlugForName(channelName: string): Promise<string | null> {
  const slugByChannelName = await loadChannelSlugByNameMap();
  return resolveChannelSlug(channelName, slugByChannelName);
}

export async function loadChannelSlugByNameMap(): Promise<Map<string, string>> {
  const payload = await loadCachedChannelSlugIndex();
  return new Map(Object.entries(payload.slugByChannelName));
}

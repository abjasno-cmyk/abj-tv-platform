import type { LiveChannelGroup } from "@/components/abj/ChannelDirectory";
import { loadStructuredFeedPayload, parsePublishedTimestamp, type FeedVideo } from "@/lib/dayOverview";
import { selectLatestNonShortChannelVideos } from "@/lib/liveChannelVideos";
import { createSupabaseAnonServerClient } from "@/lib/supabase/server";

type SourceChannel = {
  channelName: string;
  channelId: string | null;
  channelUrl: string | null;
};

type YouTubeChannelApiPayload = {
  items?: Array<{
    id?: string;
    snippet?: {
      thumbnails?: {
        high?: { url?: string };
        medium?: { url?: string };
        default?: { url?: string };
      };
    };
  }>;
};

function readString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

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

function resolveYouTubeApiKey(): string | null {
  return sanitizeEnvValue(process.env.YOUTUBE_API_KEY) ?? null;
}

function normalizeChannelKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function extractYouTubeIdentifier(channelUrl: string | null): string | null {
  if (!channelUrl) return null;
  try {
    const parsed = new URL(channelUrl);
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts.length === 0) return null;
    const first = parts[0];
    if (first.startsWith("@")) {
      const handle = first.slice(1).trim();
      return handle.length > 0 ? handle : null;
    }
    if ((first === "channel" || first === "c" || first === "user") && parts[1]) {
      const candidate = parts[1].trim();
      return candidate.length > 0 ? candidate : null;
    }
  } catch {
    // Ignore malformed URLs.
  }
  return null;
}

function fallbackAvatarUrl(channelId: string | null, channelUrl: string | null): string | null {
  if (channelId) {
    return `https://unavatar.io/youtube/${encodeURIComponent(channelId)}`;
  }
  const fallbackIdentifier = extractYouTubeIdentifier(channelUrl);
  if (!fallbackIdentifier) return null;
  return `https://unavatar.io/youtube/${encodeURIComponent(fallbackIdentifier)}`;
}

async function withTimeoutFallback<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), timeoutMs);
  });
  const resolved = await Promise.race([promise, timeoutPromise]);
  if (timer) clearTimeout(timer);
  return resolved;
}

async function loadYouTubeChannelAvatars(channelIds: string[]): Promise<Map<string, string>> {
  const apiKey = resolveYouTubeApiKey();
  if (!apiKey || channelIds.length === 0) return new Map();

  const result = new Map<string, string>();
  const uniqueIds = [...new Set(channelIds.map((id) => id.trim()).filter((id) => id.length > 0))];
  for (let index = 0; index < uniqueIds.length; index += 50) {
    const batch = uniqueIds.slice(index, index + 50);
    try {
      const url = new URL("https://www.googleapis.com/youtube/v3/channels");
      url.searchParams.set("part", "snippet");
      url.searchParams.set("id", batch.join(","));
      url.searchParams.set("maxResults", String(batch.length));
      url.searchParams.set("key", apiKey);

      const response = await fetch(url.toString(), { next: { revalidate: 3600 } });
      if (!response.ok) continue;

      const payload = (await response.json()) as YouTubeChannelApiPayload;
      for (const item of payload.items ?? []) {
        const channelId = readString(item.id);
        const thumbnailUrl =
          readString(item.snippet?.thumbnails?.high?.url) ??
          readString(item.snippet?.thumbnails?.medium?.url) ??
          readString(item.snippet?.thumbnails?.default?.url);
        if (!channelId || !thumbnailUrl) continue;
        result.set(channelId, thumbnailUrl);
      }
    } catch (error) {
      console.warn("live-channels-youtube-avatar-batch-failed", error);
    }
  }

  return result;
}

async function loadSourceChannels(): Promise<SourceChannel[]> {
  try {
    const supabase = createSupabaseAnonServerClient();
    const { data, error } = await supabase
      .from("sources")
      .select("source_name, channel_id, channel_url")
      .eq("platform", "youtube")
      .eq("active", true)
      .order("source_name", { ascending: true });
    if (error) {
      console.error("live-channels-source-query-failed", error.message);
      return [];
    }

    const byKey = new Map<string, SourceChannel>();
    const rows = (data ?? []) as Array<Record<string, unknown>>;
    for (const row of rows) {
      const channelName = readString(row.source_name);
      if (!channelName) continue;
      const key = normalizeChannelKey(channelName);
      if (!key) continue;
      const nextEntry: SourceChannel = {
        channelName,
        channelId: readString(row.channel_id),
        channelUrl: readString(row.channel_url),
      };
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, nextEntry);
        continue;
      }
      if (!existing.channelId && nextEntry.channelId) existing.channelId = nextEntry.channelId;
      if (!existing.channelUrl && nextEntry.channelUrl) existing.channelUrl = nextEntry.channelUrl;
      if (nextEntry.channelName.length > existing.channelName.length) existing.channelName = nextEntry.channelName;
    }

    return [...byKey.values()];
  } catch (error) {
    console.error("live-channels-source-load-failed", error);
    return [];
  }
}

function mapLiveChannelsFromFeed(channels: Record<string, FeedVideo[]>): LiveChannelGroup[] {
  return Object.entries(channels)
    .map(([channelName, videos]) => ({
      channelName,
      avatarUrl: null,
      channelId: null,
      channelUrl: null,
      videos: selectLatestNonShortChannelVideos(
        [...videos]
          .filter((video) => typeof video.video_id === "string" && video.video_id.trim().length > 0)
          .sort((a, b) => parsePublishedTimestamp(b.published_at) - parsePublishedTimestamp(a.published_at))
          .map((video) => ({
            videoId: video.video_id,
            title: video.title,
            thumbnail: video.thumbnail ?? null,
            publishedAt: video.published_at,
            durationMin: video.duration_min ?? null,
          })),
      ).map(({ videoId, title, thumbnail, publishedAt }) => ({
        videoId,
        title,
        thumbnail,
        publishedAt,
      })),
    }))
    .sort((a, b) => a.channelName.localeCompare(b.channelName, "cs-CZ"));
}

function mergeLiveChannels(
  feedChannels: LiveChannelGroup[],
  sourceChannels: SourceChannel[],
  avatarByChannelId: Map<string, string>,
): LiveChannelGroup[] {
  const merged = new Map<string, LiveChannelGroup>();

  for (const channel of feedChannels) {
    const key = normalizeChannelKey(channel.channelName);
    if (!key) continue;
    merged.set(key, { ...channel });
  }

  for (const source of sourceChannels) {
    const key = normalizeChannelKey(source.channelName);
    if (!key) continue;
    const avatarUrl =
      (source.channelId ? avatarByChannelId.get(source.channelId) ?? null : null) ??
      fallbackAvatarUrl(source.channelId, source.channelUrl);
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, {
        channelName: source.channelName,
        avatarUrl,
        channelId: source.channelId,
        channelUrl: source.channelUrl,
        videos: [],
      });
      continue;
    }
    existing.channelName = source.channelName;
    if (!existing.channelId && source.channelId) existing.channelId = source.channelId;
    if (!existing.channelUrl && source.channelUrl) existing.channelUrl = source.channelUrl;
    if (!existing.avatarUrl && avatarUrl) existing.avatarUrl = avatarUrl;
  }

  return [...merged.values()].sort((a, b) => a.channelName.localeCompare(b.channelName, "cs-CZ"));
}

export async function loadLiveChannelsForPage(): Promise<LiveChannelGroup[]> {
  try {
    const [feedPayload, sourceChannels] = await Promise.all([
      loadStructuredFeedPayload().catch((error) => {
        console.error("live-channels-feed-load-failed", error);
        return { channels: {} as Record<string, FeedVideo[]> };
      }),
      loadSourceChannels(),
    ]);
    const feedChannels = mapLiveChannelsFromFeed(feedPayload.channels);
    const channelIds = sourceChannels
      .map((channel) => channel.channelId)
      .filter((channelId): channelId is string => Boolean(channelId));
    const avatarByChannelId = await withTimeoutFallback(
      loadYouTubeChannelAvatars(channelIds),
      1200,
      new Map<string, string>(),
    );
    return mergeLiveChannels(feedChannels, sourceChannels, avatarByChannelId);
  } catch (error) {
    console.error("live-channels-load-failed", error);
    return [];
  }
}

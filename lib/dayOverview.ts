import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CachedVideo } from "@/lib/epg-types";

export type FeedVideo = {
  video_id: string;
  title: string;
  channel: string;
  published_at: string;
  topics: string[];
  thumbnail: string;
  tldr?: string;
  context?: string;
  impact?: string;
  freshness: "breaking" | "today" | "week" | "evergreen";
};

export type FeedVideoFreshness = FeedVideo["freshness"];

export type EditorialFreshness = FeedVideo["freshness"];

export type FeedEditorial = {
  tldr: string;
  context?: string;
  impact?: string;
  freshness: EditorialFreshness;
};

export type StructuredFeedPayload = {
  top: FeedVideo[];
  topics: Record<string, FeedVideo[]>;
  channels: Record<string, FeedVideo[]>;
};
export type FeedResponse = StructuredFeedPayload;

type RawVideo = CachedVideo & {
  metadata?: unknown;
};

export const TOPIC_ORDER = ["politika", "ekonomika", "zahraničí", "společnost", "média", "rozhovory"] as const;

type TopicName = (typeof TOPIC_ORDER)[number];

const TOPIC_KEYWORDS: Record<TopicName, string[]> = {
  politika: ["vlada", "volby", "parlament", "senat", "snemovna", "okamura", "rajchl", "havlicek", "politika"],
  ekonomika: ["ekonomika", "inflace", "dluh", "deficit", "rozpocet", "dane", "finance", "euro", "energie"],
  zahraničí: ["ukrajina", "rusko", "usa", "nato", "izrael", "cina", "evropa", "zahranici"],
  společnost: ["spolecnost", "kultura", "rodina", "skolstvi", "zdravotnictvi", "svoboda", "pravo"],
  média: ["media", "novinar", "dezinformace", "mainstream", "reportaz", "zpravodajstvi", "news"],
  rozhovory: ["rozhovor", "debata", "diskuse", "podcast", "interview", "studio"],
};

const TOPIC_ALIAS: Record<string, TopicName> = {
  politika: "politika",
  ekonomika: "ekonomika",
  zahranici: "zahraničí",
  "zahraničí": "zahraničí",
  spolecnost: "společnost",
  "společnost": "společnost",
  media: "média",
  "média": "média",
  rozhovor: "rozhovory",
  rozhovory: "rozhovory",
};

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function normalizeTopic(raw: string): TopicName | null {
  const normalized = normalizeText(raw);
  return TOPIC_ALIAS[normalized] ?? null;
}

export function parsePublishedTimestamp(value: string | null | undefined): number {
  if (!value) return 0;
  const ts = new Date(value).getTime();
  return Number.isFinite(ts) ? ts : 0;
}

function toIsoOrEpoch(value: string | null | undefined): string {
  if (!value) return new Date(0).toISOString();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date(0).toISOString();
  return date.toISOString();
}

function freshnessFromPublishedAt(publishedAtIso: string): FeedVideo["freshness"] {
  const publishedTs = parsePublishedTimestamp(publishedAtIso);
  if (!publishedTs) return "evergreen";
  const ageMs = Date.now() - publishedTs;
  if (ageMs <= 6 * 60 * 60 * 1000) return "breaking";
  if (ageMs <= 24 * 60 * 60 * 1000) return "today";
  if (ageMs <= 7 * 24 * 60 * 60 * 1000) return "week";
  return "evergreen";
}

function readFreshness(metadata: Record<string, unknown> | null, publishedAtIso: string): FeedVideo["freshness"] {
  const freshnessRaw = readString(metadata?.freshness);
  if (freshnessRaw) {
    const normalized = normalizeText(freshnessRaw);
    if (normalized === "breaking" || normalized === "today" || normalized === "week" || normalized === "evergreen") {
      return normalized;
    }
  }
  return freshnessFromPublishedAt(publishedAtIso);
}

function inferTopics(video: Omit<FeedVideo, "topics">, metadata: unknown): TopicName[] {
  const topics = new Set<TopicName>();
  const metadataObject = asObject(metadata);
  const candidates: string[] = [];

  if (metadataObject) {
    const rawTopics = metadataObject.topics;
    if (Array.isArray(rawTopics)) {
      for (const topic of rawTopics) {
        if (typeof topic === "string") candidates.push(topic);
      }
    }
    if (typeof metadataObject.topic === "string") candidates.push(metadataObject.topic);
    if (typeof metadataObject.category === "string") candidates.push(metadataObject.category);
  }

  for (const candidate of candidates) {
    const mapped = normalizeTopic(candidate);
    if (mapped) topics.add(mapped);
  }

  if (topics.size === 0) {
    const content = normalizeText(`${video.title} ${video.channel}`);
    for (const topic of TOPIC_ORDER) {
      if (TOPIC_KEYWORDS[topic].some((keyword) => content.includes(keyword))) {
        topics.add(topic);
      }
    }
  }

  if (topics.size === 0) topics.add("společnost");
  return TOPIC_ORDER.filter((topic) => topics.has(topic));
}

function feedVideoFromRaw(video: RawVideo): FeedVideo {
  const metadata = asObject(video.metadata);
  const base: Omit<FeedVideo, "topics"> = {
    video_id: video.video_id,
    title: video.title,
    channel: video.channel_name,
    published_at: toIsoOrEpoch(video.published_at ?? video.created_at),
    thumbnail: video.thumbnail ?? "/placeholder-thumb.jpg",
    tldr: readString(metadata?.tldr) ?? readString(metadata?.summary),
    context: readString(metadata?.context),
    impact: readString(metadata?.impact),
    freshness: readFreshness(metadata, toIsoOrEpoch(video.published_at ?? video.created_at)),
  };

  return {
    ...base,
    topics: inferTopics(base, metadata),
  };
}

export function deduplicateVideos(videos: FeedVideo[]): FeedVideo[] {
  const seenVideoIds = new Set<string>();
  const seenTitleChannel = new Set<string>();
  const deduped: FeedVideo[] = [];

  for (const video of videos) {
    const videoIdKey = video.video_id.trim();
    const titleChannelKey = `${normalizeText(video.title)}|${normalizeText(video.channel)}`;
    if (videoIdKey && seenVideoIds.has(videoIdKey)) continue;
    if (seenTitleChannel.has(titleChannelKey)) continue;

    if (videoIdKey) seenVideoIds.add(videoIdKey);
    seenTitleChannel.add(titleChannelKey);
    deduped.push(video);
  }

  return deduped;
}

export function videoUniqKey(video: FeedVideo): string {
  const idKey = video.video_id.trim();
  if (idKey) return idKey;
  return `${normalizeText(video.title)}|${normalizeText(video.channel)}`;
}

export function deduplicateBySeen(video: FeedVideo, seen: Set<string>): boolean {
  const key = videoUniqKey(video);
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
}

function sortNewest(videos: FeedVideo[]): FeedVideo[] {
  return [...videos].sort((a, b) => parsePublishedTimestamp(b.published_at) - parsePublishedTimestamp(a.published_at));
}

export function groupChannelsForDisplay(
  channels: Record<string, FeedVideo[]>,
  limit: number = 5
): Array<{ channel: string; videos: FeedVideo[] }> {
  return Object.entries(channels)
    .map(([channel, items]) => ({
      channel,
      videos: deduplicateVideos(items),
    }))
    .sort((a, b) => b.videos.length - a.videos.length)
    .slice(0, limit);
}

async function loadVideosFromSupabase(): Promise<RawVideo[]> {
  const supabase = await createSupabaseServerClient();

  const canonical = await supabase
    .from("videos")
    .select(
      "id, source_id, channel_id, video_id, title, thumbnail, published_at, scheduled_start_at, video_type, channel_name, is_abj, metadata, created_at"
    )
    .order("published_at", { ascending: false })
    .limit(260);

  if (!canonical.error) {
    return (canonical.data ?? []) as RawVideo[];
  }

  const maybeSchemaMismatch = /(column|relation) .* does not exist/i.test(canonical.error.message);
  if (!maybeSchemaMismatch) {
    throw new Error(`Feed canonical query failed: ${canonical.error.message}`);
  }

  const legacy = await supabase
    .from("videos")
    .select("id, source_id, channel_id, video_id, title, thumbnail, published_at, scheduled_start_time, kind, raw, created_at")
    .order("published_at", { ascending: false })
    .limit(260);

  if (legacy.error) {
    throw new Error(`Feed legacy query failed: ${legacy.error.message}`);
  }

  const sourceIds = Array.from(
    new Set(
      ((legacy.data ?? []) as Array<{ source_id?: string | null }>)
        .map((row) => row.source_id)
        .filter((id): id is string => Boolean(id))
    )
  );

  let sourceNameById = new Map<string, string>();
  if (sourceIds.length > 0) {
    const { data: sourceRows } = await supabase.from("sources").select("id, source_name").in("id", sourceIds);
    sourceNameById = new Map((sourceRows ?? []).map((row) => [row.id as string, row.source_name as string]));
  }

  return ((legacy.data ?? []) as Array<Record<string, unknown>>).map((row) => {
    const sourceId = (row.source_id as string | null) ?? null;
    return {
      id: row.id as string,
      source_id: sourceId,
      channel_id: (row.channel_id as string) ?? "",
      video_id: row.video_id as string,
      title: row.title as string,
      thumbnail: (row.thumbnail as string | null) ?? null,
      published_at: (row.published_at as string | null) ?? null,
      scheduled_start_at: (row.scheduled_start_time as string | null) ?? null,
      video_type: row.kind === "upcoming" ? "upcoming" : "vod",
      channel_name: sourceId ? sourceNameById.get(sourceId) ?? "Neznámý kanál" : "Neznámý kanál",
      is_abj: false,
      metadata: row.raw ?? {},
      created_at: row.created_at as string,
    } satisfies RawVideo;
  });
}

export function buildStructuredFeedPayload(videos: RawVideo[]): StructuredFeedPayload {
  const merged = sortNewest(deduplicateVideos(videos.map(feedVideoFromRaw)));
  const top = merged.slice(0, 10);

  const topics: Record<string, FeedVideo[]> = Object.fromEntries(TOPIC_ORDER.map((topic) => [topic, []]));
  const channels: Record<string, FeedVideo[]> = {};

  for (const video of merged) {
    for (const topic of video.topics) {
      topics[topic].push(video);
    }
    if (!channels[video.channel]) channels[video.channel] = [];
    channels[video.channel].push(video);
  }

  for (const topic of TOPIC_ORDER) {
    topics[topic] = deduplicateVideos(topics[topic]);
  }
  const sortedChannelEntries = Object.entries(channels)
    .map(([channelName, channelVideos]) => [channelName, deduplicateVideos(channelVideos)] as const)
    .sort((a, b) => b[1].length - a[1].length);
  const orderedChannels: Record<string, FeedVideo[]> = {};
  for (const [channelName, channelVideos] of sortedChannelEntries) {
    orderedChannels[channelName] = channelVideos;
  }

  return { top, topics, channels: orderedChannels };
}

export async function loadStructuredFeedPayload(): Promise<StructuredFeedPayload> {
  const videos = await loadVideosFromSupabase();
  return buildStructuredFeedPayload(videos);
}

// Suggested cron:
// run every 15 minutes to keep cache warm
import { createClient } from "@supabase/supabase-js";

type SourceRow = {
  id: string;
  source_name: string;
  channel_id: string;
  priority: "A" | "B" | "C";
};

type SearchListResponse = {
  items?: Array<{
    id?: { videoId?: string };
  }>;
};

type VideosListResponse = {
  items?: Array<{
    id?: string;
    snippet?: {
      title?: string;
      publishedAt?: string;
      liveBroadcastContent?: "live" | "upcoming" | "none";
      channelTitle?: string;
      thumbnails?: {
        medium?: { url?: string };
        high?: { url?: string };
        default?: { url?: string };
      };
    };
    contentDetails?: {
      duration?: string;
    };
    liveStreamingDetails?: {
      scheduledStartTime?: string;
      actualStartTime?: string;
      actualEndTime?: string;
    };
  }>;
};

type ChannelsStatisticsResponse = {
  items?: Array<{
    id?: string;
    statistics?: {
      subscriberCount?: string;
    };
  }>;
};

type IngestRunStatus = "running" | "success" | "failed";

type CanonicalVideoUpsert = {
  video_id: string;
  title: string;
  thumbnail: string | null;
  published_at: string | null;
  scheduled_start_at: string | null;
  video_type: "live" | "upcoming" | "vod";
  channel_id: string;
  source_id: string;
  channel_name: string;
  is_abj: boolean;
  duration_min: number;
  live_broadcast_content: "live" | "upcoming" | "none";
  metadata: Record<string, unknown>;
  cache_refreshed_at: string;
};

type LegacyVideoUpsert = {
  video_id: string;
  title: string;
  thumbnail: string | null;
  published_at: string | null;
  scheduled_start_time: string | null;
  kind: "upcoming" | "vod";
  channel_id: string;
  source_id: string;
  raw: Record<string, unknown>;
};

export type RefreshVideoCacheResult = {
  apiCalls: number;
  stored: number;
  failedSources: string[];
  failedDetails: Array<{ source: string; error: string }>;
};

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

function requiredEnv(name: string): string {
  const value = sanitizeEnvValue(process.env[name]);
  if (!value) {
    throw new Error(`${name} not set`);
  }
  return value;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseDurationToMinutes(value?: string): number {
  if (!value) return 30;
  const match = /^P(?:\d+Y)?(?:\d+M)?(?:\d+D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/i.exec(value);
  if (!match) return 30;
  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const seconds = Number(match[3] ?? 0);
  const total = hours * 60 + minutes + seconds / 60;
  if (!Number.isFinite(total) || total <= 0) return 30;
  return Math.round(total * 10) / 10;
}

async function fetchSearchVideoIds(
  channelId: string,
  apiKey: string,
  maxResults: number
): Promise<string[]> {
  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "id");
  url.searchParams.set("channelId", channelId);
  url.searchParams.set("order", "date");
  url.searchParams.set("type", "video");
  url.searchParams.set("maxResults", String(maxResults));
  url.searchParams.set("key", apiKey);

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`search.list failed (${res.status})`);
  }
  const body = (await res.json()) as SearchListResponse;
  const ids = (body.items ?? [])
    .map((item) => item.id?.videoId)
    .filter((videoId): videoId is string => Boolean(videoId));
  return Array.from(new Set(ids));
}

async function fetchVideosDetails(videoIds: string[], apiKey: string): Promise<VideosListResponse> {
  const url = new URL("https://www.googleapis.com/youtube/v3/videos");
  url.searchParams.set("part", "snippet,contentDetails,liveStreamingDetails");
  url.searchParams.set("id", videoIds.join(","));
  url.searchParams.set("maxResults", String(videoIds.length));
  url.searchParams.set("key", apiKey);

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`videos.list failed (${res.status})`);
  }
  return (await res.json()) as VideosListResponse;
}

async function fetchChannelSubscribers(channelIds: string[], apiKey: string): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  for (let i = 0; i < channelIds.length; i += 50) {
    const chunk = channelIds.slice(i, i + 50);
    const url = new URL("https://www.googleapis.com/youtube/v3/channels");
    url.searchParams.set("part", "statistics");
    url.searchParams.set("id", chunk.join(","));
    url.searchParams.set("maxResults", String(chunk.length));
    url.searchParams.set("key", apiKey);

    const res = await fetch(url.toString());
    if (!res.ok) {
      throw new Error(`channels.list statistics failed (${res.status})`);
    }
    const body = (await res.json()) as ChannelsStatisticsResponse;
    for (const item of body.items ?? []) {
      const id = item.id;
      if (!id) continue;
      const subscribers = Number(item.statistics?.subscriberCount ?? "0");
      result.set(id, Number.isFinite(subscribers) ? subscribers : 0);
    }
  }
  return result;
}

function inferVideoType(
  liveBroadcastContent: "live" | "upcoming" | "none",
  scheduledStartTime: string | null,
  nowIso: string
): "live" | "upcoming" | "vod" {
  if (liveBroadcastContent === "live") return "live";
  if (liveBroadcastContent === "upcoming" && scheduledStartTime) {
    return new Date(scheduledStartTime).getTime() > new Date(nowIso).getTime() ? "upcoming" : "vod";
  }
  return "vod";
}

async function upsertVideosResiliently(
  supabase: {
    from: ReturnType<typeof createClient>["from"];
  },
  rows: CanonicalVideoUpsert[]
): Promise<{ stored: number; usedLegacyFallback: boolean }> {
  if (rows.length === 0) {
    return { stored: 0, usedLegacyFallback: false };
  }

  const canonicalUpsert = await supabase.from("videos").upsert(rows as never[], {
    onConflict: "video_id",
  });
  if (!canonicalUpsert.error) {
    return { stored: rows.length, usedLegacyFallback: false };
  }

  const isVideoTypeConstraint =
    /videos_video_type_check|check constraint/i.test(canonicalUpsert.error.message) &&
    /video_type/i.test(canonicalUpsert.error.message);
  if (isVideoTypeConstraint) {
    const downgradedRows = rows.map((row) => ({
      ...row,
      video_type: row.video_type === "live" ? ("upcoming" as const) : row.video_type,
    }));
    const downgradedUpsert = await supabase.from("videos").upsert(downgradedRows as never[], {
      onConflict: "video_id",
    });
    if (!downgradedUpsert.error) {
      return { stored: downgradedRows.length, usedLegacyFallback: false };
    }
  }

  const isSchemaMismatch = /(column|relation) .* does not exist/i.test(canonicalUpsert.error.message);
  if (!isSchemaMismatch) {
    throw new Error(canonicalUpsert.error.message);
  }

  const legacyRows: LegacyVideoUpsert[] = rows.map((row) => ({
    video_id: row.video_id,
    title: row.title,
    thumbnail: row.thumbnail,
    published_at: row.published_at,
    scheduled_start_time: row.scheduled_start_at,
    kind: row.video_type === "upcoming" ? "upcoming" : "vod",
    channel_id: row.channel_id,
    source_id: row.source_id,
    raw: row.metadata,
  }));

  const legacyUpsert = await supabase.from("videos").upsert(legacyRows as never[], {
    onConflict: "video_id",
  });
  if (legacyUpsert.error) {
    throw new Error(legacyUpsert.error.message);
  }

  return { stored: legacyRows.length, usedLegacyFallback: true };
}

export async function refreshVideoCache(): Promise<RefreshVideoCacheResult> {
  const supabaseUrl = requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const supabaseAnonKey = requiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const youtubeApiKey = requiredEnv("YOUTUBE_API_KEY");
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { data: sourcesData, error: sourcesError } = await supabase
    .from("sources")
    .select("id, source_name, channel_id, priority")
    .eq("platform", "youtube")
    .eq("active", true)
    .not("channel_id", "is", null)
    .order("priority", { ascending: true })
    .order("source_name", { ascending: true });

  if (sourcesError) {
    throw new Error(`Failed to load sources: ${sourcesError.message}`);
  }

  const sources = (sourcesData ?? []) as SourceRow[];
  let apiCalls = 0;
  let stored = 0;
  const failedSources: string[] = [];
  const failedDetails: Array<{ source: string; error: string }> = [];
  const nowIso = new Date().toISOString();

  const uniqueChannelIds = Array.from(new Set(sources.map((source) => source.channel_id)));
  let subscribersByChannel = new Map<string, number>();
  if (uniqueChannelIds.length > 0) {
    try {
      subscribersByChannel = await fetchChannelSubscribers(uniqueChannelIds, youtubeApiKey);
      apiCalls += Math.ceil(uniqueChannelIds.length / 50);
    } catch (error) {
      console.warn("channels statistics fetch failed, continuing without subscribers", error);
    }
  }

  for (const source of sources) {
    try {
      const maxResults = source.priority === "A" ? 12 : source.priority === "B" ? 8 : 6;
      const videoIds = await fetchSearchVideoIds(source.channel_id, youtubeApiKey, maxResults);
      apiCalls += 1;

      if (videoIds.length === 0) {
        console.log(`[MISS] ${source.source_name}: no videos from search.list`);
        await sleep(150);
        continue;
      }

      const videosResponse = await fetchVideosDetails(videoIds, youtubeApiKey);
      apiCalls += 1;
      const detailById = new Map(
        (videosResponse.items ?? [])
          .map((item) => [item.id, item] as const)
          .filter((entry): entry is [string, NonNullable<VideosListResponse["items"]>[number]] => Boolean(entry[0]))
      );

      const rows: CanonicalVideoUpsert[] = [];
      for (const videoId of videoIds) {
        const details = detailById.get(videoId);
        if (!details?.snippet?.title) continue;

        const snippet = details.snippet;
        const snippetTitle = snippet.title;
        if (!snippetTitle) continue;
        const liveBroadcastContent = (snippet.liveBroadcastContent ?? "none") as "live" | "upcoming" | "none";
        const scheduledStartTime = details.liveStreamingDetails?.scheduledStartTime ?? null;
        const actualStartTime = details.liveStreamingDetails?.actualStartTime ?? null;
        const durationIso = details.contentDetails?.duration;
        const durationMin = parseDurationToMinutes(durationIso);
        const videoType = inferVideoType(liveBroadcastContent, scheduledStartTime, nowIso);
        const thumbnail =
          snippet.thumbnails?.high?.url ??
          snippet.thumbnails?.medium?.url ??
          snippet.thumbnails?.default?.url ??
          null;
        const isABJ = source.source_name.toLowerCase().includes("abj");
        const subscriberCount = subscribersByChannel.get(source.channel_id) ?? 0;

        rows.push({
          video_id: videoId,
          title: snippetTitle,
          thumbnail,
          published_at: snippet.publishedAt ?? null,
          scheduled_start_at: scheduledStartTime,
          video_type: videoType,
          channel_id: source.channel_id,
          source_id: source.id,
          channel_name: source.source_name,
          is_abj: isABJ,
          duration_min: durationMin,
          live_broadcast_content: liveBroadcastContent,
          metadata: {
            duration: durationIso ?? null,
            durationMin,
            liveBroadcastContent,
            scheduledStartTime,
            actualStartTime,
            actualEndTime: details.liveStreamingDetails?.actualEndTime ?? null,
            subscriberCount,
            channelTitle: snippet.channelTitle ?? source.source_name,
            ingestedAt: nowIso,
            sourcePriority: source.priority,
          },
          cache_refreshed_at: nowIso,
        });
      }

      const upsertResult = await upsertVideosResiliently(supabase, rows);
      stored += upsertResult.stored;
      if (upsertResult.usedLegacyFallback) {
        console.log(`[OK] ${source.source_name}: upserted ${upsertResult.stored} videos (legacy schema)`);
      } else {
        console.log(`[OK] ${source.source_name}: upserted ${upsertResult.stored} videos`);
      }
    } catch (err) {
      failedSources.push(source.source_name);
      failedDetails.push({
        source: source.source_name,
        error: err instanceof Error ? err.message : String(err),
      });
      console.error(`[FAIL] ${source.source_name}:`, err);
    }

    await sleep(150);
  }

  return {
    apiCalls,
    stored,
    failedSources,
    failedDetails,
  };
}

async function main() {
  const supabase = createClient(requiredEnv("NEXT_PUBLIC_SUPABASE_URL"), requiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"));
  const runStartedAt = new Date().toISOString();

  let status: IngestRunStatus = "success";
  let apiCalls = 0;
  let stored = 0;
  let runErrorText: string | null = null;

  try {
    const result = await refreshVideoCache();
    apiCalls = result.apiCalls;
    stored = result.stored;
    if (result.failedSources.length > 0) {
      status = "failed";
      runErrorText = `Failed sources: ${result.failedSources.join(", ")}`;
    }
  } catch (error) {
    status = "failed";
    runErrorText = error instanceof Error ? error.message : String(error);
    console.error("refreshVideoCache failed", error);
  }

  const { error: runError } = await supabase.from("ingest_runs").insert({
    started_at: runStartedAt,
    status,
    api_calls: apiCalls,
    videos_upserted: stored,
    error_text: runErrorText,
    finished_at: new Date().toISOString(),
  });
  if (runError) {
    console.error("Failed to insert ingest_runs row:", runError.message);
  }

  console.log(`API calls made: ${apiCalls}`);
  console.log(`Videos stored: ${stored}`);
}

const maybeEntrypoint = process.argv[1] ?? "";
if (maybeEntrypoint.endsWith("fetchVideos.ts") || maybeEntrypoint.endsWith("fetchVideos.js")) {
  main().catch((err) => {
    console.error("fetchVideos failed:", err);
    process.exitCode = 1;
  });
}

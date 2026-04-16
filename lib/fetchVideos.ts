// Suggested cron:
// run every 15 minutes to keep cache warm
// Quota-safe mode: use uploads playlist + batched videos.list (avoid search.list)
import { createClient } from "@supabase/supabase-js";

type SourceRow = {
  id: string;
  source_name: string;
  channel_id: string;
  uploads_playlist_id: string;
  priority: "A" | "B" | "C";
};

type PlaylistItemsResponse = {
  items?: Array<{
    snippet?: {
      resourceId?: { videoId?: string };
    };
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

type SourceMeta = {
  sourceId: string;
  sourceName: string;
  sourcePriority: "A" | "B" | "C";
  channelId: string;
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

function maxResultsByPriority(priority: "A" | "B" | "C"): number {
  if (priority === "A") return 6;
  if (priority === "B") return 4;
  return 3;
}

async function fetchUploadsVideoIds(
  uploadsPlaylistId: string,
  apiKey: string,
  maxResults: number
): Promise<string[]> {
  const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("playlistId", uploadsPlaylistId);
  url.searchParams.set("maxResults", String(maxResults));
  url.searchParams.set("key", apiKey);

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`playlistItems.list failed (${res.status})`);
  }

  const body = (await res.json()) as PlaylistItemsResponse;
  const ids = (body.items ?? [])
    .map((item) => item.snippet?.resourceId?.videoId)
    .filter((videoId): videoId is string => Boolean(videoId));
  return Array.from(new Set(ids));
}

async function fetchVideosDetailsBatch(videoIds: string[], apiKey: string): Promise<VideosListResponse> {
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
    .select("id, source_name, channel_id, uploads_playlist_id, priority")
    .eq("platform", "youtube")
    .eq("active", true)
    .not("channel_id", "is", null)
    .not("uploads_playlist_id", "is", null)
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

  const sourceByVideoId = new Map<string, SourceMeta>();
  for (const source of sources) {
    try {
      const videoIds = await fetchUploadsVideoIds(
        source.uploads_playlist_id,
        youtubeApiKey,
        maxResultsByPriority(source.priority)
      );
      apiCalls += 1;

      if (videoIds.length === 0) {
        console.log(`[MISS] ${source.source_name}: no videos from uploads playlist`);
        await sleep(120);
        continue;
      }

      for (const videoId of videoIds) {
        if (!sourceByVideoId.has(videoId)) {
          sourceByVideoId.set(videoId, {
            sourceId: source.id,
            sourceName: source.source_name,
            sourcePriority: source.priority,
            channelId: source.channel_id,
          });
        }
      }
    } catch (err) {
      failedSources.push(source.source_name);
      failedDetails.push({
        source: source.source_name,
        error: err instanceof Error ? err.message : String(err),
      });
      console.error(`[FAIL] ${source.source_name}:`, err);
    }
    await sleep(120);
  }

  const videoIds = [...sourceByVideoId.keys()];
  const detailsByVideoId = new Map<string, NonNullable<VideosListResponse["items"]>[number]>();
  for (let idx = 0; idx < videoIds.length; idx += 50) {
    const batch = videoIds.slice(idx, idx + 50);
    try {
      const details = await fetchVideosDetailsBatch(batch, youtubeApiKey);
      apiCalls += 1;
      for (const item of details.items ?? []) {
        if (!item.id) continue;
        detailsByVideoId.set(item.id, item);
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      for (const videoId of batch) {
        const source = sourceByVideoId.get(videoId);
        if (!source) continue;
        if (!failedSources.includes(source.sourceName)) {
          failedSources.push(source.sourceName);
          failedDetails.push({
            source: source.sourceName,
            error: `videos.list batch failed: ${errMsg}`,
          });
        }
      }
      console.error("[FAIL] videos.list batch:", err);
    }
    await sleep(120);
  }

  const rows: CanonicalVideoUpsert[] = [];
  for (const videoId of videoIds) {
    const source = sourceByVideoId.get(videoId);
    const details = detailsByVideoId.get(videoId);
    if (!source || !details?.snippet?.title) continue;

    const snippet = details.snippet;
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
    const isABJ = source.sourceName.toLowerCase().includes("abj");

    rows.push({
      video_id: videoId,
      title: snippet.title ?? "Bez názvu",
      thumbnail,
      published_at: snippet.publishedAt ?? null,
      scheduled_start_at: scheduledStartTime,
      video_type: videoType,
      channel_id: source.channelId,
      source_id: source.sourceId,
      channel_name: source.sourceName,
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
        channelTitle: snippet.channelTitle ?? source.sourceName,
        ingestedAt: nowIso,
        sourcePriority: source.sourcePriority,
        ingestMode: "uploads-playlist-batch-videos-list",
      },
      cache_refreshed_at: nowIso,
    });
  }

  if (rows.length > 0) {
    try {
      const upsertResult = await upsertVideosResiliently(supabase, rows);
      stored += upsertResult.stored;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      failedDetails.push({ source: "videos-upsert", error: errMsg });
      if (!failedSources.includes("videos-upsert")) {
        failedSources.push("videos-upsert");
      }
      console.error("[FAIL] videos upsert:", err);
    }
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
      status = result.stored > 0 ? "running" : "failed";
      runErrorText = result.failedDetails
        .slice(0, 8)
        .map((item) => `${item.source}: ${item.error}`)
        .join(" | ");
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

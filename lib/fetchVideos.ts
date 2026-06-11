// Suggested cron:
// run every 15 minutes to keep cache warm
// Quota-safe mode: use uploads playlist + batched videos.list (avoid search.list)
import { createClient } from "@supabase/supabase-js";
import { resolveChannelIdsFromChannelUrl } from "@/lib/youtubeChannelResolve";

type SourceRow = {
  id: string;
  source_name: string;
  channel_url: string;
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

type ChannelsListResponse = {
  items?: Array<{
    contentDetails?: {
      relatedPlaylists?: {
        uploads?: string;
      };
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
  resolvedSources: number;
  healedSources: number;
  failedSources: string[];
  failedDetails: Array<{ source: string; error: string }>;
};

type SourceIdUpdate = {
  channelId: string;
  uploadsPlaylistId: string;
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

/**
 * Service-role client for the ingest cron. Bypasses RLS so the trusted
 * server-side import can upsert videos/sources and log ingest_runs once
 * those tables have RLS enabled (anon key would be rejected).
 */
function createIngestClient() {
  return createClient(requiredEnv("NEXT_PUBLIC_SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
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

async function fetchUploadsPlaylistIdByChannelId(
  channelId: string,
  apiKey: string
): Promise<string | null> {
  const url = new URL("https://www.googleapis.com/youtube/v3/channels");
  url.searchParams.set("part", "contentDetails");
  url.searchParams.set("id", channelId);
  url.searchParams.set("maxResults", "1");
  url.searchParams.set("key", apiKey);

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`channels.list failed (${res.status})`);
  }

  const body = (await res.json()) as ChannelsListResponse;
  return body.items?.[0]?.contentDetails?.relatedPlaylists?.uploads ?? null;
}

function isPlaylistItems404(error: unknown): boolean {
  return error instanceof Error && /playlistItems\.list failed \(404\)/i.test(error.message);
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

async function persistSourceYoutubeIds(
  supabase: ReturnType<typeof createIngestClient>,
  sourceId: string,
  ids: SourceIdUpdate
): Promise<boolean> {
  const { error } = await supabase
    .from("sources")
    .update({
      channel_id: ids.channelId,
      uploads_playlist_id: ids.uploadsPlaylistId,
    })
    .eq("id", sourceId);
  return !error;
}

async function ensureUnresolvedSourceIds(
  supabase: ReturnType<typeof createIngestClient>,
  youtubeApiKey: string
): Promise<{ resolvedSources: number; apiCalls: number }> {
  const { data, error } = await supabase
    .from("sources")
    .select("id, source_name, channel_url, channel_id, uploads_playlist_id")
    .eq("platform", "youtube")
    .eq("active", true)
    .or("channel_id.is.null,uploads_playlist_id.is.null");

  if (error) {
    throw new Error(`Failed to load unresolved sources: ${error.message}`);
  }

  let resolvedSources = 0;
  let apiCalls = 0;

  for (const row of data ?? []) {
    const sourceName = typeof row.source_name === "string" ? row.source_name : "unknown";
    const channelUrl = typeof row.channel_url === "string" ? row.channel_url.trim() : "";
    const sourceId = typeof row.id === "string" ? row.id : "";
    if (!channelUrl || !sourceId) continue;

    try {
      const resolved = await resolveChannelIdsFromChannelUrl(channelUrl, youtubeApiKey);
      apiCalls += 1;
      if (!resolved) {
        console.warn(`[MISS] ${sourceName}: unable to resolve channel_id from URL`);
        await sleep(120);
        continue;
      }

      const persisted = await persistSourceYoutubeIds(supabase, sourceId, {
        channelId: resolved.channelId,
        uploadsPlaylistId: resolved.uploadsPlaylistId,
      });
      if (!persisted) {
        console.warn(`[FAIL] ${sourceName}: failed to persist resolved channel_id`);
      } else {
        resolvedSources += 1;
        console.log(
          `[OK] ${sourceName}: resolved channel=${resolved.channelId} uploads=${resolved.uploadsPlaylistId}`
        );
      }
    } catch (err) {
      console.error(`[FAIL] ${sourceName}:`, err);
    }

    await sleep(120);
  }

  return { resolvedSources, apiCalls };
}

async function healStaleSourceIds(
  supabase: ReturnType<typeof createIngestClient>,
  source: SourceRow,
  youtubeApiKey: string
): Promise<{ ids: SourceIdUpdate | null; apiCalls: number }> {
  const channelUrl = source.channel_url?.trim() ?? "";
  if (!channelUrl) return { ids: null, apiCalls: 0 };

  const resolved = await resolveChannelIdsFromChannelUrl(channelUrl, youtubeApiKey);
  if (!resolved) return { ids: null, apiCalls: 1 };

  if (
    resolved.channelId === source.channel_id &&
    resolved.uploadsPlaylistId === source.uploads_playlist_id
  ) {
    return { ids: null, apiCalls: 1 };
  }

  const persisted = await persistSourceYoutubeIds(supabase, source.id, {
    channelId: resolved.channelId,
    uploadsPlaylistId: resolved.uploadsPlaylistId,
  });
  if (!persisted) {
    console.warn(`[WARN] ${source.source_name}: failed to persist healed channel_id`);
    return { ids: null, apiCalls: 1 };
  }

  console.log(
    `[OK] ${source.source_name}: healed channel ${source.channel_id} -> ${resolved.channelId}`
  );
  return {
    ids: {
      channelId: resolved.channelId,
      uploadsPlaylistId: resolved.uploadsPlaylistId,
    },
    apiCalls: 1,
  };
}

export async function refreshVideoCache(): Promise<RefreshVideoCacheResult> {
  const youtubeApiKey = requiredEnv("YOUTUBE_API_KEY");
  const supabase = createIngestClient();

  const unresolved = await ensureUnresolvedSourceIds(supabase, youtubeApiKey);

  const { data: sourcesData, error: sourcesError } = await supabase
    .from("sources")
    .select("id, source_name, channel_url, channel_id, uploads_playlist_id, priority")
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
  let apiCalls = unresolved.apiCalls;
  let stored = 0;
  let healedSources = 0;
  const failedSources: string[] = [];
  const failedDetails: Array<{ source: string; error: string }> = [];
  const nowIso = new Date().toISOString();

  const sourceByVideoId = new Map<string, SourceMeta>();
  for (const source of sources) {
    try {
      let activeChannelId = source.channel_id;
      let uploadsPlaylistId = source.uploads_playlist_id;
      let videoIds: string[] = [];
      const maxResults = maxResultsByPriority(source.priority);

      const loadUploadsVideoIds = async () =>
        fetchUploadsVideoIds(uploadsPlaylistId, youtubeApiKey, maxResults);

      try {
        videoIds = await loadUploadsVideoIds();
        apiCalls += 1;
      } catch (err) {
        if (!isPlaylistItems404(err)) {
          throw err;
        }

        console.warn(
          `[WARN] ${source.source_name}: playlist ${uploadsPlaylistId} returned 404, resolving uploads playlist from channel_id ${activeChannelId}`
        );
        const refreshedUploadsPlaylistId = await fetchUploadsPlaylistIdByChannelId(
          activeChannelId,
          youtubeApiKey
        );
        apiCalls += 1;

        if (!refreshedUploadsPlaylistId) {
          throw new Error(`Unable to resolve uploads playlist for channel_id ${activeChannelId}`);
        }

        uploadsPlaylistId = refreshedUploadsPlaylistId;
        if (uploadsPlaylistId !== source.uploads_playlist_id) {
          const persisted = await persistSourceYoutubeIds(supabase, source.id, {
            channelId: activeChannelId,
            uploadsPlaylistId,
          });
          if (!persisted) {
            console.warn(
              `[WARN] ${source.source_name}: failed to persist refreshed uploads_playlist_id`
            );
          } else {
            source.uploads_playlist_id = uploadsPlaylistId;
            console.log(
              `[OK] ${source.source_name}: uploads_playlist_id auto-updated to ${uploadsPlaylistId}`
            );
          }
        }

        videoIds = await loadUploadsVideoIds();
        apiCalls += 1;
      }

      if (videoIds.length === 0) {
        const healed = await healStaleSourceIds(supabase, source, youtubeApiKey);
        apiCalls += healed.apiCalls;
        if (healed.ids) {
          healedSources += 1;
          activeChannelId = healed.ids.channelId;
          uploadsPlaylistId = healed.ids.uploadsPlaylistId;
          source.channel_id = healed.ids.channelId;
          source.uploads_playlist_id = healed.ids.uploadsPlaylistId;
          videoIds = await fetchUploadsVideoIds(
            uploadsPlaylistId,
            youtubeApiKey,
            maxResults
          );
          apiCalls += 1;
        }
      }

      if (videoIds.length === 0) {
        const message = "no videos from uploads playlist (channel_id may still be stale)";
        failedSources.push(source.source_name);
        failedDetails.push({ source: source.source_name, error: message });
        console.log(`[MISS] ${source.source_name}: ${message}`);
        await sleep(120);
        continue;
      }

      for (const videoId of videoIds) {
        if (!sourceByVideoId.has(videoId)) {
          sourceByVideoId.set(videoId, {
            sourceId: source.id,
            sourceName: source.source_name,
            sourcePriority: source.priority,
            channelId: activeChannelId,
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
    resolvedSources: unresolved.resolvedSources,
    healedSources,
    failedSources,
    failedDetails,
  };
}

async function main() {
  const supabase = createIngestClient();
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

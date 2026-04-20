import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getNowPlaying, getProgram } from "@/lib/programEngine";
import type { ProgramBlock } from "@/lib/epg-types";

type HealthStatus = "ok" | "warning" | "error";

type HealthCheck = {
  id: string;
  status: HealthStatus;
  message: string;
  details?: Record<string, unknown>;
};

type IngestRunRow = {
  id: string;
  started_at: string;
  finished_at: string | null;
  status: "running" | "success" | "failed";
  api_calls: number;
  videos_upserted: number;
  error_text: string | null;
};

type ProgramHealthOptions = {
  probeYouTube?: boolean;
  includeLiveSmoke?: boolean;
};

function statusRank(status: HealthStatus): number {
  if (status === "error") return 3;
  if (status === "warning") return 2;
  return 1;
}

function maxStatus(a: HealthStatus, b: HealthStatus): HealthStatus {
  return statusRank(a) >= statusRank(b) ? a : b;
}

function blockTypeCounts(blocks: ProgramBlock[]): Record<string, number> {
  return blocks.reduce<Record<string, number>>((acc, block) => {
    acc[block.type] = (acc[block.type] ?? 0) + 1;
    return acc;
  }, {});
}

function pickActiveLiveLikeBlock(timeline: ProgramBlock[], now: Date): ProgramBlock | null {
  const nowTs = now.getTime();
  const active = timeline
    .filter((block) => {
      if (!block.videoId) return false;
      if (block.type !== "live" && block.type !== "premiere") return false;
      const startTs = new Date(block.start).getTime();
      const endTs = new Date(block.end).getTime();
      return Number.isFinite(startTs) && Number.isFinite(endTs) && startTs <= nowTs && nowTs < endTs;
    })
    .sort((a, b) => b.priority - a.priority || new Date(a.start).getTime() - new Date(b.start).getTime());
  return active[0] ?? null;
}

function isMaybeSchemaMismatch(message: string): boolean {
  return /(column|relation) .* does not exist/i.test(message);
}

function parse403Hint(text: string | null | undefined): boolean {
  if (!text) return false;
  return /(403|quota|forbidden|access not configured|permission)/i.test(text);
}

function parseDateSafe(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function minutesSince(value: Date | null, now: Date): number | null {
  if (!value) return null;
  return Math.max(0, Math.round((now.getTime() - value.getTime()) / 60_000));
}

function buildRecommendations(checks: HealthCheck[], lastErrorText: string | null): string[] {
  const recommendations: string[] = [];

  const ingestCheck = checks.find((check) => check.id === "ingest");
  if (ingestCheck?.status !== "ok") {
    recommendations.push(
      "Ingest je aktuálně nestabilní nebo selhal; otevři `/api/program/v3/refresh-cache` a zkontroluj `failedSources`."
    );
  }

  const hasApi403 = parse403Hint(lastErrorText);
  if (hasApi403) {
    recommendations.push(
      "YouTube 403 detected: ověř v Google Cloud Console, že je zapnutá YouTube Data API v3."
    );
    recommendations.push(
      "U API klíče zkontroluj Application restrictions: pro server cron použij buď bez HTTP referrer restrikce, nebo IP restriction pro Vercel egress není stabilní."
    );
    recommendations.push(
      "U API klíče zkontroluj API restrictions: povol YouTube Data API v3."
    );
    recommendations.push(
      "V Quotas panelu ověř, že projekt má dostupnou denní kvótu a není vyčerpaná."
    );
  }

  const hasNoVideos = checks.some((check) => check.id === "videos-cache" && check.status === "error");
  if (hasNoVideos) {
    recommendations.push(
      "Spusť ručně refresh endpoint `/api/program/v3/refresh-cache` a ověř, že `videosStored > 0`."
    );
  }

  const hasOldCache = checks.some((check) => check.id === "cache-freshness" && check.status !== "ok");
  if (hasOldCache) {
    recommendations.push(
      "Zkontroluj Vercel Cron, že běží každých 15 minut a volá správný projekt + branch."
    );
  }

  if (recommendations.length === 0) {
    recommendations.push("Systém je zdravý. Pokračuj v monitoringu přes `/api/program/v3/health`.");
  }

  return recommendations;
}

export async function getProgramHealth(options: ProgramHealthOptions = {}) {
  const now = new Date();
  const supabase = await createSupabaseServerClient();

  let checks: HealthCheck[] = [];
  let overall: HealthStatus = "ok";

  const timeline = await getProgram();
  const nowPlaying = await getNowPlaying();
  const playableBlocks = timeline.filter((block) => Boolean(block.videoId));
  const types = blockTypeCounts(timeline);

  if (timeline.length === 0) {
    checks.push({
      id: "timeline",
      status: "error",
      message: "Timeline je prázdná.",
    });
    overall = maxStatus(overall, "error");
  } else {
    checks.push({
      id: "timeline",
      status: "ok",
      message: "Timeline je dostupná.",
      details: {
        blocks: timeline.length,
        playableBlocks: playableBlocks.length,
        types,
      },
    });
  }

  if (!nowPlaying) {
    checks.push({
      id: "now-playing",
      status: "warning",
      message: "Now Playing není aktuálně určeno.",
    });
    overall = maxStatus(overall, "warning");
  } else {
    checks.push({
      id: "now-playing",
      status: "ok",
      message: "Now Playing je určeno.",
      details: {
        type: nowPlaying.type,
        title: nowPlaying.title,
        channel: nowPlaying.channel,
      },
    });
  }

  if (options.includeLiveSmoke !== false) {
    const activeLiveBlock = pickActiveLiveLikeBlock(timeline, now);
    if (activeLiveBlock?.videoId && nowPlaying?.videoId && nowPlaying.videoId !== activeLiveBlock.videoId) {
      checks.push({
        id: "live-selection-consistency",
        status: "error",
        message:
          "Neshoda výběru živého streamu: nowPlaying neodpovídá aktivnímu live/premiere bloku.",
        details: {
          nowPlaying: {
            videoId: nowPlaying.videoId,
            type: nowPlaying.type,
            title: nowPlaying.title,
            channel: nowPlaying.channel,
          },
          activeLive: {
            videoId: activeLiveBlock.videoId,
            type: activeLiveBlock.type,
            title: activeLiveBlock.title,
            channel: activeLiveBlock.channel,
          },
        },
      });
      overall = maxStatus(overall, "error");
    } else if (activeLiveBlock?.videoId) {
      checks.push({
        id: "live-selection-consistency",
        status: "ok",
        message: "Výběr živého streamu je konzistentní.",
        details: {
          activeVideoId: activeLiveBlock.videoId,
          activeType: activeLiveBlock.type,
        },
      });
    } else {
      checks.push({
        id: "live-selection-consistency",
        status: "ok",
        message: "Aktivní live/premiere blok nyní není k dispozici.",
      });
    }
  }

  const activeSourcesQuery = await supabase
    .from("sources")
    .select("id", { count: "exact", head: true })
    .eq("platform", "youtube")
    .eq("active", true);
  const activeSources = activeSourcesQuery.error ? 0 : activeSourcesQuery.count ?? 0;
  if (activeSources === 0) {
    checks.push({
      id: "sources",
      status: "warning",
      message: "Nebyl nalezen žádný aktivní YouTube source.",
    });
    overall = maxStatus(overall, "warning");
  } else {
    checks.push({
      id: "sources",
      status: "ok",
      message: "Aktivní YouTube sources načteny.",
      details: { count: activeSources },
    });
  }

  const videosCountQuery = await supabase
    .from("videos")
    .select("id", { count: "exact", head: true });
  const videosCached =
    videosCountQuery.error && isMaybeSchemaMismatch(videosCountQuery.error.message)
      ? 0
      : (videosCountQuery.count ?? 0);

  if (videosCached === 0) {
    checks.push({
      id: "videos-cache",
      status: "error",
      message: "Cache `videos` je prázdná.",
    });
    overall = maxStatus(overall, "error");
  } else {
    checks.push({
      id: "videos-cache",
      status: "ok",
      message: "Cache `videos` obsahuje data.",
      details: { count: videosCached },
    });
  }

  let latestRefreshAt: Date | null = null;
  let recent24hCount: number | null = null;

  const refreshQuery = await supabase
    .from("videos")
    .select("cache_refreshed_at, created_at")
    .order("cache_refreshed_at", { ascending: false })
    .limit(1);

  if (!refreshQuery.error && refreshQuery.data?.length) {
    const row = refreshQuery.data[0] as { cache_refreshed_at?: string | null; created_at?: string | null };
    latestRefreshAt = parseDateSafe(row.cache_refreshed_at ?? row.created_at ?? null);
  } else if (refreshQuery.error && isMaybeSchemaMismatch(refreshQuery.error.message)) {
    const legacyRefreshQuery = await supabase
      .from("videos")
      .select("created_at")
      .order("created_at", { ascending: false })
      .limit(1);
    if (!legacyRefreshQuery.error && legacyRefreshQuery.data?.length) {
      const row = legacyRefreshQuery.data[0] as { created_at?: string | null };
      latestRefreshAt = parseDateSafe(row.created_at ?? null);
    }
  }

  const recentQuery = await supabase
    .from("videos")
    .select("id", { count: "exact", head: true })
    .gte("published_at", new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString());
  if (!recentQuery.error) {
    recent24hCount = recentQuery.count ?? 0;
  }

  const cacheAgeMin = minutesSince(latestRefreshAt, now);
  if (cacheAgeMin === null) {
    checks.push({
      id: "cache-freshness",
      status: "warning",
      message: "Nelze určit stáří cache.",
    });
    overall = maxStatus(overall, "warning");
  } else if (cacheAgeMin > 30) {
    checks.push({
      id: "cache-freshness",
      status: "warning",
      message: `Cache je stará ${cacheAgeMin} minut.`,
      details: { maxExpectedMinutes: 15 },
    });
    overall = maxStatus(overall, "warning");
  } else {
    checks.push({
      id: "cache-freshness",
      status: "ok",
      message: `Cache je čerstvá (${cacheAgeMin} min).`,
    });
  }

  const ingestQuery = await supabase
    .from("ingest_runs")
    .select("id, started_at, finished_at, status, api_calls, videos_upserted, error_text")
    .order("started_at", { ascending: false })
    .limit(3);

  const recentIngestRuns = ((ingestQuery.data ?? []) as IngestRunRow[]).sort((a, b) => {
    const aStarted = parseDateSafe(a.started_at)?.getTime() ?? 0;
    const bStarted = parseDateSafe(b.started_at)?.getTime() ?? 0;
    if (aStarted !== bStarted) return bStarted - aStarted;

    const aFinished = parseDateSafe(a.finished_at)?.getTime() ?? 0;
    const bFinished = parseDateSafe(b.finished_at)?.getTime() ?? 0;
    if (aFinished !== bFinished) return bFinished - aFinished;

    return b.id.localeCompare(a.id);
  });

  const latestIngest = recentIngestRuns[0];
  const latestIngestErrorText = latestIngest?.error_text ?? null;
  if (!latestIngest) {
    checks.push({
      id: "ingest",
      status: "warning",
      message: "Nebyl nalezen žádný ingest run.",
    });
    overall = maxStatus(overall, "warning");
  } else if (latestIngest.status === "failed" && latestIngest.videos_upserted <= 0) {
    checks.push({
      id: "ingest",
      status: parse403Hint(latestIngestErrorText) ? "error" : "warning",
      message: "Poslední ingest run selhal (0 uložených videí).",
      details: {
        startedAt: latestIngest.started_at,
        apiCalls: latestIngest.api_calls,
        videosUpserted: latestIngest.videos_upserted,
        errorText: latestIngest.error_text,
      },
    });
    overall = maxStatus(overall, parse403Hint(latestIngestErrorText) ? "error" : "warning");
  } else if (latestIngest.status === "failed" && latestIngest.videos_upserted > 0) {
    checks.push({
      id: "ingest",
      status: "warning",
      message: "Poslední ingest run byl částečně úspěšný.",
      details: {
        startedAt: latestIngest.started_at,
        apiCalls: latestIngest.api_calls,
        videosUpserted: latestIngest.videos_upserted,
        errorText: latestIngest.error_text,
      },
    });
    overall = maxStatus(overall, "warning");
  } else {
    checks.push({
      id: "ingest",
      status: "ok",
      message: "Poslední ingest run byl úspěšný.",
      details: {
        startedAt: latestIngest.started_at,
        apiCalls: latestIngest.api_calls,
        videosUpserted: latestIngest.videos_upserted,
      },
    });
  }

  const recommendations = buildRecommendations(checks, latestIngestErrorText);
  const youtubeProbe = options.probeYouTube ? await runYouTubeKeyProbe() : undefined;

  return {
    generatedAt: now.toISOString(),
    timezone: "Europe/Prague",
    date: new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Prague" }).format(now),
    overallStatus: overall,
    summary: {
      timelineBlocks: timeline.length,
      playableBlocks: playableBlocks.length,
      videosCached,
      activeSources,
      recent24hCount,
    },
    cache: {
      latestRefreshAt: latestRefreshAt?.toISOString() ?? null,
      ageMinutes: cacheAgeMin,
    },
    ingest: latestIngest
      ? {
          status: latestIngest.status,
          startedAt: latestIngest.started_at,
          finishedAt: latestIngest.finished_at,
          apiCalls: latestIngest.api_calls,
          videosUpserted: latestIngest.videos_upserted,
          errorText: latestIngest.error_text,
          recentRuns: recentIngestRuns.map((run) => ({
            id: run.id,
            status: run.status,
            startedAt: run.started_at,
            finishedAt: run.finished_at,
            apiCalls: run.api_calls,
            videosUpserted: run.videos_upserted,
            errorText: run.error_text,
          })),
        }
      : null,
    checks,
    recommendations,
    ...(youtubeProbe ? { youtubeProbe } : {}),
  };
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

function keyFingerprint(value: string | undefined): string | null {
  if (!value) return null;
  if (value.length <= 10) return value;
  return `${value.slice(0, 5)}...${value.slice(-5)}`;
}

export async function runYouTubeKeyProbe() {
  const rawKey = sanitizeEnvValue(process.env.YOUTUBE_API_KEY);
  if (!rawKey) {
    return {
      ok: false,
      reason: "YOUTUBE_API_KEY is missing in runtime env",
      keyFingerprint: null,
      status: null,
      error: "missing_key",
    };
  }

  const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("playlistId", "UU4ghMQ16P3acuKKXHTtkS7w");
  url.searchParams.set("maxResults", "1");
  url.searchParams.set("key", rawKey);

  try {
    const response = await fetch(url.toString(), { cache: "no-store" });
    const rawText = await response.text();
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      parsed = null;
    }

    const itemCount =
      parsed && typeof parsed === "object" && Array.isArray((parsed as { items?: unknown[] }).items)
        ? (parsed as { items: unknown[] }).items.length
        : 0;

    return {
      ok: response.ok,
      reason: response.ok ? "probe_ok" : "probe_failed",
      keyFingerprint: keyFingerprint(rawKey),
      status: response.status,
      itemCount,
      error:
        parsed && typeof parsed === "object"
          ? ((parsed as { error?: unknown }).error ?? null)
          : rawText.slice(0, 500),
    };
  } catch (error) {
    return {
      ok: false,
      reason: "network_or_fetch_error",
      keyFingerprint: keyFingerprint(rawKey),
      status: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

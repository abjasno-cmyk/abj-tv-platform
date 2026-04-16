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

export async function getProgramHealth() {
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
  };
}

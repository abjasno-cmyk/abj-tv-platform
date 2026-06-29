import "server-only";

import { parseRssFeed } from "@/lib/noviny/rss";
import {
  createNovinyServiceClient,
  getSourceById,
  insertNovinyFetchLog,
  listAdminNovinySources,
  updateNovinySource,
  upsertNovinyArticlesFromRss,
} from "@/lib/noviny/repository";
import type { NovinySourceRow } from "@/lib/noviny/types";

export type NovinyImportRunType = "cron" | "manual" | "api";

export type NovinyImportSourceReport = {
  sourceId: string;
  sourceName: string;
  status: "success" | "warning" | "error";
  importedCount: number;
  deduplicatedCount: number;
  skippedCount: number;
  message: string;
  errorDetail: string | null;
  warnings: string[];
  httpStatus: number | null;
  durationMs: number;
};

export type NovinyImportReport = {
  startedAt: string;
  finishedAt: string;
  totalSources: number;
  successSources: number;
  warningSources: number;
  errorSources: number;
  importedCount: number;
  deduplicatedCount: number;
  skippedCount: number;
  sources: NovinyImportSourceReport[];
};

type ImportOptions = {
  runType: NovinyImportRunType;
  sourceId?: string;
};

function buildUserAgent() {
  return "verox-noviny-rss-importer/1.0 (+https://www.verox.cz/noviny)";
}

async function fetchSourceFeed(source: NovinySourceRow): Promise<{ statusCode: number; body: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(source.rss_url, {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.8",
        "User-Agent": buildUserAgent(),
      },
      signal: controller.signal,
    });
    const body = await response.text();
    return { statusCode: response.status, body };
  } finally {
    clearTimeout(timeout);
  }
}

async function importSingleSource(
  source: NovinySourceRow,
  runType: NovinyImportRunType,
): Promise<NovinyImportSourceReport> {
  const startedAt = Date.now();
  const supabase = createNovinyServiceClient();
  const nowIso = new Date().toISOString();
  try {
    const fetched = await fetchSourceFeed(source);
    if (fetched.statusCode < 200 || fetched.statusCode >= 300) {
      const durationMs = Date.now() - startedAt;
      const message = `RSS vrátil HTTP ${fetched.statusCode}.`;
      await insertNovinyFetchLog(supabase, {
        source_id: source.id,
        run_type: runType,
        status: "error",
        http_status: fetched.statusCode,
        imported_count: 0,
        deduplicated_count: 0,
        skipped_count: 0,
        duration_ms: durationMs,
        message,
        error_detail: null,
        payload: { rssUrl: source.rss_url },
      });
      await updateNovinySource(supabase, source.id, { last_fetched_at: nowIso });
      return {
        sourceId: source.id,
        sourceName: source.name,
        status: "error",
        importedCount: 0,
        deduplicatedCount: 0,
        skippedCount: 0,
        message,
        errorDetail: null,
        warnings: [],
        httpStatus: fetched.statusCode,
        durationMs,
      };
    }

    const parsed = parseRssFeed(fetched.body, {
      sourceName: source.name,
      sourceLanguage: source.language,
      allowImages: source.allow_images,
    });
    const importStats = await upsertNovinyArticlesFromRss(supabase, source, parsed.articles);
    const status = parsed.warnings.length > 0 ? "warning" : "success";
    const durationMs = Date.now() - startedAt;
    const message =
      status === "warning"
        ? `Import dokončen s upozorněními (${parsed.warnings.length}).`
        : "Import dokončen.";

    await insertNovinyFetchLog(supabase, {
      source_id: source.id,
      run_type: runType,
      status,
      http_status: fetched.statusCode,
      imported_count: importStats.imported,
      deduplicated_count: importStats.deduplicated,
      skipped_count: importStats.skipped,
      duration_ms: durationMs,
      message,
      error_detail: null,
      payload: {
        rssUrl: source.rss_url,
        feedTitle: parsed.feedTitle,
        warnings: parsed.warnings,
      },
    });

    await updateNovinySource(supabase, source.id, {
      last_fetched_at: nowIso,
      last_success_at: nowIso,
    });

    return {
      sourceId: source.id,
      sourceName: source.name,
      status,
      importedCount: importStats.imported,
      deduplicatedCount: importStats.deduplicated,
      skippedCount: importStats.skipped,
      message,
      errorDetail: null,
      warnings: parsed.warnings,
      httpStatus: fetched.statusCode,
      durationMs,
    };
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    const detail = error instanceof Error ? error.message : "Neznámá chyba importu RSS.";
    await insertNovinyFetchLog(supabase, {
      source_id: source.id,
      run_type: runType,
      status: "error",
      http_status: null,
      imported_count: 0,
      deduplicated_count: 0,
      skipped_count: 0,
      duration_ms: durationMs,
      message: "Import selhal.",
      error_detail: detail,
      payload: { rssUrl: source.rss_url },
    });
    await updateNovinySource(supabase, source.id, { last_fetched_at: nowIso });
    return {
      sourceId: source.id,
      sourceName: source.name,
      status: "error",
      importedCount: 0,
      deduplicatedCount: 0,
      skippedCount: 0,
      message: "Import selhal.",
      errorDetail: detail,
      warnings: [],
      httpStatus: null,
      durationMs,
    };
  }
}

export async function runNovinyImport(options: ImportOptions): Promise<NovinyImportReport> {
  const startedAt = new Date().toISOString();
  const supabase = createNovinyServiceClient();
  let sources: NovinySourceRow[] = [];

  if (options.sourceId) {
    const source = await getSourceById(supabase, options.sourceId);
    if (source && source.is_active) {
      sources = [source];
    }
  } else {
    const allSources = await listAdminNovinySources(supabase);
    sources = allSources.filter((source) => source.is_active);
  }

  const reports: NovinyImportSourceReport[] = [];
  for (const source of sources) {
    const report = await importSingleSource(source, options.runType);
    reports.push(report);
  }

  const summary = reports.reduce(
    (acc, report) => {
      acc.importedCount += report.importedCount;
      acc.deduplicatedCount += report.deduplicatedCount;
      acc.skippedCount += report.skippedCount;
      if (report.status === "success") acc.successSources += 1;
      if (report.status === "warning") acc.warningSources += 1;
      if (report.status === "error") acc.errorSources += 1;
      return acc;
    },
    {
      importedCount: 0,
      deduplicatedCount: 0,
      skippedCount: 0,
      successSources: 0,
      warningSources: 0,
      errorSources: 0,
    },
  );

  return {
    startedAt,
    finishedAt: new Date().toISOString(),
    totalSources: sources.length,
    successSources: summary.successSources,
    warningSources: summary.warningSources,
    errorSources: summary.errorSources,
    importedCount: summary.importedCount,
    deduplicatedCount: summary.deduplicatedCount,
    skippedCount: summary.skippedCount,
    sources: reports,
  };
}

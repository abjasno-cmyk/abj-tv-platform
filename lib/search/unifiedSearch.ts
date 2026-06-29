import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { extractPlainTextFromTipTapJson } from "@/lib/nazory/content";
import { listPublicNovinyArticles } from "@/lib/noviny/repository";
import { getVisibleArticlePerex, getVisibleArticleTitle } from "@/lib/noviny/public";
import { createSupabaseAnonServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";
import { loadCachedVideoTranscript } from "@/lib/seo/transcriptServer";
import { buildVideoSlug, videoSeoPath } from "@/lib/seo/slug";
import { resolveVideoThumbnail, resolveVideoTitle, videoSharePath } from "@/lib/viewer/videoMetadata";

export type VeroxSearchContentType = "video" | "video_transcript" | "zpravy" | "nazory";

export type VeroxSearchDocumentInput = {
  contentType: VeroxSearchContentType;
  sourceTable: string;
  sourceId: string;
  sourceUrl: string;
  title: string;
  excerpt: string | null;
  bodyText: string;
  sourceLabel: string | null;
  thumbnailUrl: string | null;
  publishedAt: string | null;
  importanceScore: number;
  metadata?: Record<string, unknown>;
};

export type VeroxSearchResult = {
  id: string;
  contentType: VeroxSearchContentType;
  sourceId: string;
  sourceUrl: string;
  title: string;
  excerpt: string | null;
  sourceLabel: string | null;
  thumbnailUrl: string | null;
  publishedAt: string | null;
  relevanceScore: number;
  ftsScore: number;
  fuzzyScore: number;
  semanticScore: number;
  recencyScore: number;
  importanceScore: number;
};

export type VeroxSearchSummary = {
  text: string;
  sourceIds: string[];
};

export type VeroxSearchResponse = {
  query: string;
  results: VeroxSearchResult[];
  summary: VeroxSearchSummary | null;
  semanticEnabled: boolean;
};

type VideoIndexRow = {
  video_id: string;
  title: string | null;
  thumbnail: string | null;
  channel_name: string | null;
  published_at: string | null;
  scheduled_start_at: string | null;
  created_at?: string | null;
  metadata: unknown;
};

type OpinionIndexRow = {
  id: string;
  slug: string;
  title: string;
  perex: string;
  content_json: Record<string, unknown>;
  published_at: string | null;
  updated_at: string;
};

const SEARCH_EMBEDDING_MODEL = process.env.VEROX_SEARCH_EMBEDDING_MODEL?.trim() || "text-embedding-3-small";
const SEARCH_SUMMARY_MODEL = process.env.VEROX_SEARCH_SUMMARY_MODEL?.trim() || "gpt-4o-mini";
const DEFAULT_TRANSCRIPT_INDEX_LIMIT = 10;

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function truncate(value: string, max: number): string {
  const normalized = normalizeText(value);
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 1).trimEnd()}…`;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function readMetadataString(metadata: unknown, key: string): string | null {
  const value = asRecord(metadata)[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function resolvePublishedAt(row: VideoIndexRow): string | null {
  return row.published_at ?? row.scheduled_start_at ?? row.created_at ?? null;
}

function vectorLiteral(values: number[]): string {
  return `[${values.map((value) => Number(value).toFixed(8)).join(",")}]`;
}

async function embedText(text: string): Promise<number[] | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;
  const input = truncate(text, 7000);
  if (!input) return null;

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: SEARCH_EMBEDDING_MODEL,
      input,
    }),
  });
  if (!response.ok) return null;
  const payload = (await response.json()) as { data?: Array<{ embedding?: number[] }> };
  const embedding = payload.data?.[0]?.embedding;
  return Array.isArray(embedding) && embedding.length === 1536 ? embedding : null;
}

async function upsertSearchDocument(supabase: SupabaseClient, input: VeroxSearchDocumentInput): Promise<void> {
  const embedding = await embedText(`${input.title}\n${input.excerpt ?? ""}\n${input.bodyText}`);
  const payload: Record<string, unknown> = {
    content_type: input.contentType,
    source_table: input.sourceTable,
    source_id: input.sourceId,
    source_url: input.sourceUrl,
    title: truncate(input.title, 500),
    excerpt: input.excerpt ? truncate(input.excerpt, 900) : null,
    body_text: truncate(input.bodyText, 12_000),
    source_label: input.sourceLabel,
    thumbnail_url: input.thumbnailUrl,
    published_at: input.publishedAt,
    importance_score: Math.max(0, Math.min(100, Math.round(input.importanceScore))),
    metadata: input.metadata ?? {},
  };
  if (embedding) payload.embedding = vectorLiteral(embedding);

  const { error } = await supabase.from("verox_search_documents").upsert(payload, {
    onConflict: "content_type,source_id",
  });
  if (error) throw error;
}

async function loadVideoRows(supabase: SupabaseClient, limit: number): Promise<VideoIndexRow[]> {
  const { data, error } = await supabase
    .from("videos")
    .select("video_id,title,thumbnail,channel_name,published_at,scheduled_start_at,created_at,metadata")
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error || !Array.isArray(data)) return [];
  return data as VideoIndexRow[];
}

function videoDocument(row: VideoIndexRow): VeroxSearchDocumentInput | null {
  const videoId = row.video_id?.trim();
  if (!videoId) return null;
  const title = resolveVideoTitle(videoId, row.title);
  const publishedAt = resolvePublishedAt(row);
  const slug = buildVideoSlug({ title, publishedAt, videoId });
  const excerpt =
    readMetadataString(row.metadata, "tldr") ??
    readMetadataString(row.metadata, "summary") ??
    readMetadataString(row.metadata, "context") ??
    null;

  return {
    contentType: "video",
    sourceTable: "videos",
    sourceId: videoId,
    sourceUrl: slug ? videoSeoPath(slug) : videoSharePath(videoId),
    title,
    excerpt,
    bodyText: [title, row.channel_name ?? "", excerpt ?? "", readMetadataString(row.metadata, "impact") ?? ""].join(" "),
    sourceLabel: row.channel_name?.trim() || "Video",
    thumbnailUrl: resolveVideoThumbnail(videoId, row.thumbnail),
    publishedAt,
    importanceScore: 70,
    metadata: { video_id: videoId },
  };
}

async function videoTranscriptDocument(row: VideoIndexRow): Promise<VeroxSearchDocumentInput | null> {
  const videoId = row.video_id?.trim();
  if (!videoId) return null;
  const transcript = await loadCachedVideoTranscript(videoId);
  const text = transcript?.transcript?.trim() || transcript?.transcript_original?.trim() || "";
  if (text.length < 120) return null;
  const title = `${resolveVideoTitle(videoId, row.title)} — přepis`;
  const publishedAt = resolvePublishedAt(row);

  return {
    contentType: "video_transcript",
    sourceTable: "video_transcripts",
    sourceId: videoId,
    sourceUrl: `${videoSharePath(videoId)}#prepis`,
    title,
    excerpt: truncate(text, 420),
    bodyText: text,
    sourceLabel: row.channel_name?.trim() || "Přepis videa",
    thumbnailUrl: resolveVideoThumbnail(videoId, row.thumbnail),
    publishedAt,
    importanceScore: 78,
    metadata: { video_id: videoId, transcript_status: transcript?.status ?? null },
  };
}

async function indexVideos(supabase: SupabaseClient, limit: number): Promise<number> {
  const rows = await loadVideoRows(supabase, limit);
  let indexed = 0;
  for (const row of rows) {
    const doc = videoDocument(row);
    if (doc) {
      await upsertSearchDocument(supabase, doc);
      indexed += 1;
    }
  }

  const transcriptLimit = Math.max(
    0,
    Math.min(
      rows.length,
      Number(process.env.VEROX_SEARCH_TRANSCRIPT_INDEX_LIMIT ?? DEFAULT_TRANSCRIPT_INDEX_LIMIT) ||
        DEFAULT_TRANSCRIPT_INDEX_LIMIT,
    ),
  );
  for (const row of rows.slice(0, transcriptLimit)) {
    const doc = await videoTranscriptDocument(row);
    if (doc) {
      await upsertSearchDocument(supabase, doc);
      indexed += 1;
    }
  }
  return indexed;
}

async function indexZpravy(supabase: SupabaseClient, limit: number): Promise<number> {
  const articles = await listPublicNovinyArticles(supabase, { limit });
  let indexed = 0;
  for (const article of articles) {
    const title = getVisibleArticleTitle(article);
    const perex = getVisibleArticlePerex(article);
    const approvedPoints =
      article.enrichment?.ai_status === "approved" ? article.enrichment.ai_summary_5_points.join(" ") : "";
    const bodyText = [title, perex ?? "", approvedPoints, article.tags.join(" ")].join(" ");
    await upsertSearchDocument(supabase, {
      contentType: "zpravy",
      sourceTable: "noviny_articles",
      sourceId: article.id,
      sourceUrl: `/noviny#noviny-article-${article.id}`,
      title,
      excerpt: perex,
      bodyText,
      sourceLabel: article.source?.name ?? "Zprávy",
      thumbnailUrl: article.image_url,
      publishedAt: article.published_at,
      importanceScore: article.enrichment?.ai_relevance_score ?? 62,
      metadata: { original_url: article.original_url, source_slug: article.source?.slug ?? null },
    });
    indexed += 1;
  }
  return indexed;
}

async function loadOpinionRows(supabase: SupabaseClient, limit: number): Promise<OpinionIndexRow[]> {
  const { data, error } = await supabase
    .from("opinion_articles")
    .select("id,slug,title,perex,content_json,published_at,updated_at")
    .eq("status", "published")
    .is("deleted_at", null)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error || !Array.isArray(data)) return [];
  return data as OpinionIndexRow[];
}

async function indexNazory(supabase: SupabaseClient, limit: number): Promise<number> {
  const rows = await loadOpinionRows(supabase, limit);
  let indexed = 0;
  for (const article of rows) {
    const text = extractPlainTextFromTipTapJson(article.content_json);
    await upsertSearchDocument(supabase, {
      contentType: "nazory",
      sourceTable: "opinion_articles",
      sourceId: article.id,
      sourceUrl: `/nazory/${article.slug}`,
      title: article.title,
      excerpt: article.perex,
      bodyText: [article.title, article.perex, text].join(" "),
      sourceLabel: "Názory",
      thumbnailUrl: null,
      publishedAt: article.published_at ?? article.updated_at,
      importanceScore: 68,
      metadata: { slug: article.slug },
    });
    indexed += 1;
  }
  return indexed;
}

export async function runUnifiedSearchIndex(limit = 80): Promise<{
  videos: number;
  zpravy: number;
  nazory: number;
  total: number;
  semanticEnabled: boolean;
  errors: string[];
}> {
  const supabase = createSupabaseServiceClient();
  const errors: string[] = [];
  let videos = 0;
  let zpravy = 0;
  let nazory = 0;

  // Indexace běží záměrně postupně. Supabase projekty s menším connection limitem
  // tak nedostanou špičku souběžných dotazů, když cron zrovna běží při provozu webu.
  try {
    videos = await indexVideos(supabase, limit);
  } catch (error) {
    errors.push(`videos: ${error instanceof Error ? error.message : "unknown error"}`);
  }
  try {
    zpravy = await indexZpravy(supabase, limit);
  } catch (error) {
    errors.push(`zpravy: ${error instanceof Error ? error.message : "unknown error"}`);
  }
  try {
    nazory = await indexNazory(supabase, limit);
  } catch (error) {
    errors.push(`nazory: ${error instanceof Error ? error.message : "unknown error"}`);
  }

  return {
    videos,
    zpravy,
    nazory,
    total: videos + zpravy + nazory,
    semanticEnabled: Boolean(process.env.OPENAI_API_KEY?.trim()),
    errors,
  };
}

function mapSearchRow(row: Record<string, unknown>): VeroxSearchResult {
  return {
    id: String(row.id),
    contentType: String(row.content_type) as VeroxSearchContentType,
    sourceId: String(row.source_id),
    sourceUrl: String(row.source_url),
    title: String(row.title),
    excerpt: typeof row.excerpt === "string" ? row.excerpt : null,
    sourceLabel: typeof row.source_label === "string" ? row.source_label : null,
    thumbnailUrl: typeof row.thumbnail_url === "string" ? row.thumbnail_url : null,
    publishedAt: typeof row.published_at === "string" ? row.published_at : null,
    relevanceScore: Number(row.relevance_score ?? 0),
    ftsScore: Number(row.fts_score ?? 0),
    fuzzyScore: Number(row.fuzzy_score ?? 0),
    semanticScore: Number(row.semantic_score ?? 0),
    recencyScore: Number(row.recency_score ?? 0),
    importanceScore: Number(row.importance_score ?? 0),
  };
}

async function buildAiSummary(query: string, results: VeroxSearchResult[]): Promise<VeroxSearchSummary | null> {
  const top = results.slice(0, 5).filter((result) => result.excerpt?.trim());
  if (query.trim().length < 2 || top.length === 0) return null;

  const sourceIds = top.map((result) => result.id);
  const fallbackText = `Z nalezených pasáží vyplývá, že dotaz souvisí hlavně s těmito výsledky: ${top
    .map((result) => `${result.title}: ${truncate(result.excerpt ?? "", 120)}`)
    .slice(0, 3)
    .join("; ")}.`;

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return { text: fallbackText, sourceIds };

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: SEARCH_SUMMARY_MODEL,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "Vytvoř krátké české shrnutí pouze z dodaných nalezených pasáží. Nepřidávej žádná fakta mimo zdroje. Uveď opatrnou formulaci a maximálně 4 věty.",
          },
          {
            role: "user",
            content: JSON.stringify({
              query,
              passages: top.map((result, index) => ({
                index: index + 1,
                title: result.title,
                type: result.contentType,
                excerpt: result.excerpt,
              })),
            }),
          },
        ],
      }),
    });
    if (!response.ok) return { text: fallbackText, sourceIds };
    const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const text = payload.choices?.[0]?.message?.content?.trim();
    return { text: text || fallbackText, sourceIds };
  } catch {
    return { text: fallbackText, sourceIds };
  }
}

export async function searchVerox(input: {
  query: string;
  limit?: number;
  contentTypes?: VeroxSearchContentType[] | null;
}): Promise<VeroxSearchResponse> {
  const query = input.query.trim();
  const supabase = createSupabaseAnonServerClient();
  const queryEmbedding = query ? await embedText(query) : null;
  const { data, error } = await supabase.rpc("verox_hybrid_search", {
    p_query: query,
    p_query_embedding: queryEmbedding ? vectorLiteral(queryEmbedding) : null,
    p_limit: Math.max(1, Math.min(50, input.limit ?? 20)),
    p_content_types: input.contentTypes && input.contentTypes.length > 0 ? input.contentTypes : null,
  });
  if (error) {
    throw new Error(error.message || "Vyhledávání selhalo.");
  }
  const results = ((data ?? []) as Array<Record<string, unknown>>).map(mapSearchRow);
  return {
    query,
    results,
    summary: await buildAiSummary(query, results),
    semanticEnabled: Boolean(queryEmbedding),
  };
}

import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseAnonServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";
import type {
  NovinyArticleRow,
  NovinyArticleWithRelations,
  NovinyCategoryRow,
  NovinyFetchLogRow,
  NovinyRssArticleInput,
  NovinySourceRow,
} from "@/lib/noviny/types";
import { inferSourceSlug } from "@/lib/noviny/url";

type ListPublicArticlesOptions = {
  limit?: number;
  sourceId?: string | null;
};

type CreateSourceInput = {
  name: string;
  rssUrl: string;
  homepageUrl: string | null;
  language: string | null;
  country: string | null;
  categoryId: string | null;
  allowImages: boolean;
  legalNote: string | null;
};

type UpdateSourceInput = {
  name?: string;
  rss_url?: string;
  homepage_url?: string | null;
  language?: string | null;
  country?: string | null;
  category_id?: string | null;
  allow_images?: boolean;
  legal_note?: string | null;
  is_active?: boolean;
  last_fetched_at?: string;
  last_success_at?: string;
};

type UpdateArticleInput = {
  edited_title?: string | null;
  edited_perex?: string | null;
  category_id?: string | null;
  is_hidden?: boolean;
};

export type ImportStats = {
  imported: number;
  deduplicated: number;
  skipped: number;
};

const ARTICLE_SELECT =
  "id,source_id,category_id,source_article_id,title,perex,original_url,canonical_url,published_at,image_url,image_usage_safe,external_author,language,is_hidden,edited_title,edited_perex,metadata,imported_at,created_at,updated_at";

const SOURCE_SELECT =
  "id,slug,name,homepage_url,rss_url,language,country,category_id,is_active,allow_images,legal_note,last_fetched_at,last_success_at,created_at,updated_at";

const CATEGORY_SELECT = "id,slug,name,description,created_at";

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function asSourceRow(row: unknown): NovinySourceRow {
  return asRecord(row) as unknown as NovinySourceRow;
}

function asCategoryRow(row: unknown): NovinyCategoryRow {
  return asRecord(row) as unknown as NovinyCategoryRow;
}

function asArticleRow(row: unknown): NovinyArticleRow {
  return asRecord(row) as unknown as NovinyArticleRow;
}

async function loadArticleTagsMap(
  supabase: SupabaseClient,
  articleIds: string[],
): Promise<Map<string, string[]>> {
  const uniqueArticleIds = Array.from(new Set(articleIds));
  if (uniqueArticleIds.length === 0) return new Map();

  const { data: relRows, error: relError } = await supabase
    .from("noviny_article_tags")
    .select("article_id, tag_id")
    .in("article_id", uniqueArticleIds);
  if (relError) throw relError;

  const tagIds = Array.from(
    new Set(
      (relRows ?? [])
        .map((row) => String((row as Record<string, unknown>).tag_id ?? ""))
        .filter((value) => value.length > 0),
    ),
  );
  if (tagIds.length === 0) return new Map();

  const { data: tagsRows, error: tagsError } = await supabase
    .from("noviny_tags")
    .select("id, name")
    .in("id", tagIds);
  if (tagsError) throw tagsError;

  const tagNameById = new Map(
    (tagsRows ?? []).map((row) => [
      String((row as Record<string, unknown>).id),
      String((row as Record<string, unknown>).name ?? ""),
    ]),
  );

  const tagsByArticle = new Map<string, string[]>();
  for (const row of relRows ?? []) {
    const record = row as Record<string, unknown>;
    const articleId = String(record.article_id ?? "");
    const tagId = String(record.tag_id ?? "");
    const tagName = tagNameById.get(tagId);
    if (!articleId || !tagName) continue;
    const list = tagsByArticle.get(articleId) ?? [];
    if (!list.includes(tagName)) list.push(tagName);
    tagsByArticle.set(articleId, list);
  }
  return tagsByArticle;
}

export function createNovinyPublicClient(): SupabaseClient {
  return createSupabaseAnonServerClient();
}

export function createNovinyServiceClient(): SupabaseClient {
  return createSupabaseServiceClient();
}

export async function listNovinyCategories(
  supabase: SupabaseClient,
  includeAll = false,
): Promise<NovinyCategoryRow[]> {
  const query = supabase.from("noviny_categories").select(CATEGORY_SELECT).order("name", { ascending: true });
  const { data, error } = includeAll ? await query : await query;
  if (error) throw error;
  return (data ?? []).map(asCategoryRow);
}

export async function listPublicNovinySources(
  supabase: SupabaseClient,
  limit = 80,
): Promise<NovinySourceRow[]> {
  const { data, error } = await supabase
    .from("noviny_sources")
    .select(SOURCE_SELECT)
    .eq("is_active", true)
    .order("name", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(asSourceRow);
}

export async function listAdminNovinySources(supabase: SupabaseClient): Promise<NovinySourceRow[]> {
  const { data, error } = await supabase
    .from("noviny_sources")
    .select(SOURCE_SELECT)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(asSourceRow);
}

export async function getPublicSourceBySlug(
  supabase: SupabaseClient,
  slug: string,
): Promise<NovinySourceRow | null> {
  const { data, error } = await supabase
    .from("noviny_sources")
    .select(SOURCE_SELECT)
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  return data ? asSourceRow(data) : null;
}

export async function getSourceById(supabase: SupabaseClient, sourceId: string): Promise<NovinySourceRow | null> {
  const { data, error } = await supabase.from("noviny_sources").select(SOURCE_SELECT).eq("id", sourceId).maybeSingle();
  if (error) throw error;
  return data ? asSourceRow(data) : null;
}

export async function listPublicNovinyArticles(
  supabase: SupabaseClient,
  opts: ListPublicArticlesOptions = {},
): Promise<NovinyArticleWithRelations[]> {
  const limit = Math.max(1, Math.min(250, opts.limit ?? 60));
  let query = supabase
    .from("noviny_articles")
    .select(ARTICLE_SELECT)
    .eq("is_hidden", false)
    .not("published_at", "is", null)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (opts.sourceId) {
    query = query.eq("source_id", opts.sourceId);
  }
  const { data, error } = await query;
  if (error) throw error;
  const articles = (data ?? []).map(asArticleRow);

  const sourceIds = Array.from(new Set(articles.map((article) => article.source_id)));
  const categoryIds = Array.from(
    new Set(articles.map((article) => article.category_id).filter((value): value is string => Boolean(value))),
  );

  const [sourcesRes, categoriesRes] = await Promise.all([
    sourceIds.length > 0
      ? supabase.from("noviny_sources").select("id,name,slug,homepage_url,language,country").in("id", sourceIds)
      : Promise.resolve({ data: [], error: null }),
    categoryIds.length > 0
      ? supabase.from("noviny_categories").select("id,slug,name").in("id", categoryIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (sourcesRes.error) throw sourcesRes.error;
  if (categoriesRes.error) throw categoriesRes.error;

  const sourceMap = new Map(
    (sourcesRes.data ?? []).map((source) => [String((source as Record<string, unknown>).id), source as Record<string, unknown>]),
  );
  const categoryMap = new Map(
    (categoriesRes.data ?? []).map((category) => [
      String((category as Record<string, unknown>).id),
      category as Record<string, unknown>,
    ]),
  );
  const tagsByArticle = await loadArticleTagsMap(
    supabase,
    articles.map((article) => article.id),
  );

  return articles.map((article) => ({
    ...article,
    source: (sourceMap.get(article.source_id) ?? null) as NovinyArticleWithRelations["source"],
    category: article.category_id
      ? ((categoryMap.get(article.category_id) ?? null) as NovinyArticleWithRelations["category"])
      : null,
    tags: tagsByArticle.get(article.id) ?? [],
  }));
}

export async function listAdminNovinyArticles(
  supabase: SupabaseClient,
  limit = 200,
): Promise<NovinyArticleWithRelations[]> {
  const { data, error } = await supabase
    .from("noviny_articles")
    .select(ARTICLE_SELECT)
    .order("imported_at", { ascending: false, nullsFirst: false })
    .limit(Math.max(1, Math.min(500, limit)));
  if (error) throw error;
  const rows = (data ?? []).map(asArticleRow);

  const sourceIds = Array.from(new Set(rows.map((article) => article.source_id)));
  const categoryIds = Array.from(
    new Set(rows.map((article) => article.category_id).filter((value): value is string => Boolean(value))),
  );

  const [sourcesRes, categoriesRes] = await Promise.all([
    sourceIds.length > 0
      ? supabase.from("noviny_sources").select("id,name,slug,homepage_url,language,country").in("id", sourceIds)
      : Promise.resolve({ data: [], error: null }),
    categoryIds.length > 0
      ? supabase.from("noviny_categories").select("id,slug,name").in("id", categoryIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (sourcesRes.error) throw sourcesRes.error;
  if (categoriesRes.error) throw categoriesRes.error;

  const sourceMap = new Map(
    (sourcesRes.data ?? []).map((source) => [String((source as Record<string, unknown>).id), source as Record<string, unknown>]),
  );
  const categoryMap = new Map(
    (categoriesRes.data ?? []).map((category) => [
      String((category as Record<string, unknown>).id),
      category as Record<string, unknown>,
    ]),
  );
  const tagsByArticle = await loadArticleTagsMap(
    supabase,
    rows.map((article) => article.id),
  );

  return rows.map((article) => ({
    ...article,
    source: (sourceMap.get(article.source_id) ?? null) as NovinyArticleWithRelations["source"],
    category: article.category_id
      ? ((categoryMap.get(article.category_id) ?? null) as NovinyArticleWithRelations["category"])
      : null,
    tags: tagsByArticle.get(article.id) ?? [],
  }));
}

async function resolveUniqueSourceSlug(supabase: SupabaseClient, preferredName: string): Promise<string> {
  const base = inferSourceSlug(preferredName);
  let attempt = base;
  for (let i = 0; i < 50; i += 1) {
    const { data, error } = await supabase.from("noviny_sources").select("id").eq("slug", attempt).maybeSingle();
    if (error) throw error;
    if (!data) return attempt;
    attempt = `${base}-${i + 2}`;
  }
  return `${base}-${Date.now()}`;
}

export async function createNovinySource(
  supabase: SupabaseClient,
  input: CreateSourceInput,
): Promise<NovinySourceRow> {
  const slug = await resolveUniqueSourceSlug(supabase, input.name);
  const payload = {
    slug,
    name: input.name.trim(),
    rss_url: input.rssUrl.trim(),
    homepage_url: input.homepageUrl,
    language: input.language,
    country: input.country,
    category_id: input.categoryId,
    allow_images: input.allowImages,
    legal_note: input.legalNote,
    is_active: true,
  };
  const { data, error } = await supabase.from("noviny_sources").insert(payload).select(SOURCE_SELECT).single();
  if (error) throw error;
  return asSourceRow(data);
}

export async function updateNovinySource(
  supabase: SupabaseClient,
  sourceId: string,
  input: UpdateSourceInput,
): Promise<NovinySourceRow> {
  const { data, error } = await supabase
    .from("noviny_sources")
    .update(input)
    .eq("id", sourceId)
    .select(SOURCE_SELECT)
    .single();
  if (error) throw error;
  return asSourceRow(data);
}

export async function updateNovinyArticle(
  supabase: SupabaseClient,
  articleId: string,
  input: UpdateArticleInput,
): Promise<NovinyArticleRow> {
  const { data, error } = await supabase
    .from("noviny_articles")
    .update(input)
    .eq("id", articleId)
    .select(ARTICLE_SELECT)
    .single();
  if (error) throw error;
  return asArticleRow(data);
}

export async function upsertNovinyArticlesFromRss(
  supabase: SupabaseClient,
  source: NovinySourceRow,
  parsedArticles: NovinyRssArticleInput[],
): Promise<ImportStats> {
  const canonicalUrls = Array.from(new Set(parsedArticles.map((item) => item.canonicalUrl)));
  if (canonicalUrls.length === 0) {
    return { imported: 0, deduplicated: 0, skipped: 0 };
  }

  const { data: existingRows, error: existingError } = await supabase
    .from("noviny_articles")
    .select("canonical_url")
    .in("canonical_url", canonicalUrls);
  if (existingError) throw existingError;

  const existingCanonical = new Set(
    (existingRows ?? []).map((row) => String((row as Record<string, unknown>).canonical_url ?? "")),
  );

  const toInsert = parsedArticles.filter((article) => !existingCanonical.has(article.canonicalUrl));
  const deduplicated = parsedArticles.length - toInsert.length;

  if (toInsert.length === 0) {
    return { imported: 0, deduplicated, skipped: 0 };
  }

  const payload = toInsert.map((article) => ({
    source_id: source.id,
    category_id: source.category_id,
    source_article_id: article.sourceArticleId,
    title: article.title,
    perex: article.perex,
    original_url: article.originalUrl,
    canonical_url: article.canonicalUrl,
    published_at: article.publishedAt,
    image_url: article.imageUrl,
    image_usage_safe: article.imageUsageSafe,
    external_author: article.externalAuthor,
    language: article.language,
    metadata: article.metadata,
  }));

  const { error } = await supabase.from("noviny_articles").insert(payload);
  if (error) throw error;

  return { imported: payload.length, deduplicated, skipped: 0 };
}

export async function insertNovinyFetchLog(
  supabase: SupabaseClient,
  payload: Omit<NovinyFetchLogRow, "id" | "fetched_at"> & { fetched_at?: string },
): Promise<void> {
  const { error } = await supabase.from("noviny_fetch_logs").insert(payload);
  if (error) throw error;
}

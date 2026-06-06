import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  buildAutoSeoDescription,
  buildAutoSeoTitle,
  estimateReadingTimeFromContentJson,
  extractPlainTextFromTipTapJson,
} from "@/lib/nazory/content";
import { buildArticleSlug } from "@/lib/nazory/slug";
import {
  OPINION_ARTICLE_COLUMNS,
  OPINION_ARTICLE_STATUS_DRAFT,
  OPINION_ARTICLE_STATUS_PUBLISHED,
  type OpinionArticleDraftInput,
  type OpinionArticleRow,
  type OpinionArticleStatus,
} from "@/lib/nazory/types";

function trimText(value: string | undefined): string {
  return value?.trim() ?? "";
}

async function loadTakenArticleSlugs(
  supabase: SupabaseClient,
  excludeArticleId?: string,
): Promise<string[]> {
  const { data, error } = await supabase.from("opinion_articles").select("slug, id");
  if (error || !data) return [];

  return (data as Array<{ slug: string; id: string }>)
    .filter((row) => row.id !== excludeArticleId)
    .map((row) => row.slug);
}

export function validateArticleForPublish(_article: Pick<OpinionArticleRow, "title" | "perex" | "content_json">): void {
  // Bez limitů délky titulku, perexu ani těla článku.
}

export function buildArticleSeoFields(
  article: Pick<OpinionArticleRow, "title" | "perex" | "content_json">,
) {
  const title = article.title.trim();
  const perex = article.perex.trim();
  return {
    seo_title: buildAutoSeoTitle(title),
    seo_description: buildAutoSeoDescription(perex, title),
    reading_time_min: estimateReadingTimeFromContentJson(article.content_json, `${title} ${perex}`),
  };
}

export async function createDraftArticle(
  supabase: SupabaseClient,
  authorId: string,
  input: OpinionArticleDraftInput = {},
): Promise<OpinionArticleRow> {
  const takenSlugs = await loadTakenArticleSlugs(supabase);
  const title = trimText(input.title);
  const slug = buildArticleSlug(title || "koncept", takenSlugs);
  const perex = trimText(input.perex);
  const contentJson = input.contentJson ?? { type: "doc", content: [] };
  const seo = buildArticleSeoFields({ title, perex, content_json: contentJson });

  const { data, error } = await supabase
    .from("opinion_articles")
    .insert({
      author_id: authorId,
      slug,
      title,
      perex,
      hero_image_path: input.heroImagePath ?? null,
      content_json: contentJson,
      status: OPINION_ARTICLE_STATUS_DRAFT,
      reading_time_min: estimateReadingTimeFromContentJson(contentJson, `${title} ${perex}`),
      seo_title: seo.seo_title,
      seo_description: seo.seo_description,
    })
    .select(OPINION_ARTICLE_COLUMNS)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Nepodařilo se vytvořit koncept článku.");
  }

  return data as OpinionArticleRow;
}

export async function updateDraftArticle(
  supabase: SupabaseClient,
  articleId: string,
  authorId: string,
  input: OpinionArticleDraftInput,
): Promise<OpinionArticleRow> {
  const existing = await getArticleByIdForAuthor(supabase, articleId, authorId);
  if (!existing) {
    throw new Error("Článek nebyl nalezen.");
  }
  if (existing.deleted_at) {
    throw new Error("Skrytý článek nelze upravovat.");
  }

  const title = input.title !== undefined ? trimText(input.title) : existing.title;
  const perex = input.perex !== undefined ? trimText(input.perex) : existing.perex;
  const contentJson = input.contentJson ?? existing.content_json;
  const slug =
    title !== existing.title
      ? buildArticleSlug(title || "koncept", await loadTakenArticleSlugs(supabase, articleId))
      : existing.slug;

  const seo = buildArticleSeoFields({ title, perex, content_json: contentJson });

  const { data, error } = await supabase
    .from("opinion_articles")
    .update({
      title,
      perex,
      slug,
      hero_image_path: input.heroImagePath ?? existing.hero_image_path,
      content_json: contentJson,
      reading_time_min: estimateReadingTimeFromContentJson(contentJson, `${title} ${perex}`),
      seo_title: seo.seo_title,
      seo_description: seo.seo_description,
    })
    .eq("id", articleId)
    .eq("author_id", authorId)
    .select(OPINION_ARTICLE_COLUMNS)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Nepodařilo se uložit článek.");
  }

  return data as OpinionArticleRow;
}

export async function publishArticle(
  supabase: SupabaseClient,
  articleId: string,
  authorId: string,
): Promise<OpinionArticleRow> {
  const existing = await getArticleByIdForAuthor(supabase, articleId, authorId);
  if (!existing) {
    throw new Error("Článek nebyl nalezen.");
  }

  validateArticleForPublish(existing);

  const seo = buildArticleSeoFields(existing);
  const readingTime = estimateReadingTimeFromContentJson(
    existing.content_json,
    `${existing.title} ${existing.perex}`,
  );

  const { data, error } = await supabase
    .from("opinion_articles")
    .update({
      status: OPINION_ARTICLE_STATUS_PUBLISHED,
      published_at: new Date().toISOString(),
      reading_time_min: readingTime,
      seo_title: seo.seo_title,
      seo_description: seo.seo_description,
    })
    .eq("id", articleId)
    .eq("author_id", authorId)
    .select(OPINION_ARTICLE_COLUMNS)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Nepodařilo se publikovat článek.");
  }

  return data as OpinionArticleRow;
}

export async function softDeleteArticle(
  supabase: SupabaseClient,
  articleId: string,
): Promise<OpinionArticleRow> {
  const { data, error } = await supabase
    .from("opinion_articles")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", articleId)
    .select(OPINION_ARTICLE_COLUMNS)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Nepodařilo se odstranit článek.");
  }

  return data as OpinionArticleRow;
}

export async function softDeleteArticleForAuthor(
  supabase: SupabaseClient,
  articleId: string,
  authorId: string,
): Promise<OpinionArticleRow> {
  const existing = await getArticleByIdForAuthor(supabase, articleId, authorId);
  if (!existing) {
    throw new Error("Článek nebyl nalezen.");
  }
  return softDeleteArticle(supabase, articleId);
}

export async function restoreArticle(
  supabase: SupabaseClient,
  articleId: string,
): Promise<OpinionArticleRow> {
  const { data, error } = await supabase
    .from("opinion_articles")
    .update({ deleted_at: null })
    .eq("id", articleId)
    .select(OPINION_ARTICLE_COLUMNS)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Nepodařilo se obnovit článek.");
  }

  return data as OpinionArticleRow;
}

export async function getPublishedArticleBySlug(
  supabase: SupabaseClient,
  slug: string,
): Promise<OpinionArticleRow | null> {
  const { data, error } = await supabase
    .from("opinion_articles")
    .select(OPINION_ARTICLE_COLUMNS)
    .eq("slug", slug)
    .eq("status", OPINION_ARTICLE_STATUS_PUBLISHED)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !data) return null;
  return data as OpinionArticleRow;
}

export async function getArticleByIdForAuthor(
  supabase: SupabaseClient,
  articleId: string,
  authorId: string,
): Promise<OpinionArticleRow | null> {
  const { data, error } = await supabase
    .from("opinion_articles")
    .select(OPINION_ARTICLE_COLUMNS)
    .eq("id", articleId)
    .eq("author_id", authorId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !data) return null;
  return data as OpinionArticleRow;
}

export async function listPublishedArticlesByAuthor(
  supabase: SupabaseClient,
  authorId: string,
  limit = 40,
): Promise<OpinionArticleRow[]> {
  const { data, error } = await supabase
    .from("opinion_articles")
    .select(OPINION_ARTICLE_COLUMNS)
    .eq("author_id", authorId)
    .eq("status", OPINION_ARTICLE_STATUS_PUBLISHED)
    .is("deleted_at", null)
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as OpinionArticleRow[];
}

export async function listPublishedArticles(
  supabase: SupabaseClient,
  limit = 40,
): Promise<OpinionArticleRow[]> {
  const { data, error } = await supabase
    .from("opinion_articles")
    .select(OPINION_ARTICLE_COLUMNS)
    .eq("status", OPINION_ARTICLE_STATUS_PUBLISHED)
    .is("deleted_at", null)
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as OpinionArticleRow[];
}

export async function getArticleById(
  supabase: SupabaseClient,
  articleId: string,
): Promise<OpinionArticleRow | null> {
  const { data, error } = await supabase
    .from("opinion_articles")
    .select(OPINION_ARTICLE_COLUMNS)
    .eq("id", articleId)
    .maybeSingle();

  if (error || !data) return null;
  return data as OpinionArticleRow;
}

export async function updateArticleByAdmin(
  supabase: SupabaseClient,
  articleId: string,
  input: OpinionArticleDraftInput,
): Promise<OpinionArticleRow> {
  const existing = await getArticleById(supabase, articleId);
  if (!existing || existing.deleted_at) {
    throw new Error("Článek nebyl nalezen.");
  }

  const title = input.title !== undefined ? trimText(input.title) : existing.title;
  const perex = input.perex !== undefined ? trimText(input.perex) : existing.perex;
  const contentJson = input.contentJson ?? existing.content_json;
  const slug =
    title !== existing.title
      ? buildArticleSlug(title || "koncept", await loadTakenArticleSlugs(supabase, articleId))
      : existing.slug;
  const seo = buildArticleSeoFields({ title, perex, content_json: contentJson });

  const { data, error } = await supabase
    .from("opinion_articles")
    .update({
      title,
      perex,
      slug,
      hero_image_path: input.heroImagePath ?? existing.hero_image_path,
      content_json: contentJson,
      reading_time_min: estimateReadingTimeFromContentJson(contentJson, `${title} ${perex}`),
      seo_title: seo.seo_title,
      seo_description: seo.seo_description,
    })
    .eq("id", articleId)
    .select(OPINION_ARTICLE_COLUMNS)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Nepodařilo se uložit článek.");
  }

  return data as OpinionArticleRow;
}

export async function listAllArticlesForAdmin(
  supabase: SupabaseClient,
  limit = 100,
): Promise<OpinionArticleRow[]> {
  const { data, error } = await supabase
    .from("opinion_articles")
    .select(OPINION_ARTICLE_COLUMNS)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as OpinionArticleRow[];
}

export async function listAuthorArticlesForAdmin(
  supabase: SupabaseClient,
  authorId: string,
): Promise<OpinionArticleRow[]> {
  const { data, error } = await supabase
    .from("opinion_articles")
    .select(OPINION_ARTICLE_COLUMNS)
    .eq("author_id", authorId)
    .order("updated_at", { ascending: false });

  if (error || !data) return [];
  return data as OpinionArticleRow[];
}

export async function listAuthorArticles(
  supabase: SupabaseClient,
  authorId: string,
  status?: OpinionArticleStatus,
): Promise<OpinionArticleRow[]> {
  let query = supabase
    .from("opinion_articles")
    .select(OPINION_ARTICLE_COLUMNS)
    .eq("author_id", authorId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return data as OpinionArticleRow[];
}

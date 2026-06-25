import type { Metadata } from "next";

import { NovinyArticleFeed } from "@/app/noviny/_components/NovinyArticleFeed";
import { NovinyContextTopics } from "@/app/noviny/_components/NovinyContextTopics";
import {
  getVisibleArticlePerex,
  getVisibleArticleTitle,
  isCzechOrSlovak,
  resolveArticleLanguage,
} from "@/lib/noviny/public";
import { fetchOriginMetadata } from "@/lib/noviny/originMetadata";
import { listPublicNovinyArticles, createNovinyPublicClient } from "@/lib/noviny/repository";
import { rankNovinyArticles } from "@/lib/noviny/ranking";
import { runNovinyImport } from "@/lib/noviny/importer";
import { SITE_URL } from "@/lib/site";
import type { NovinyArticleWithRelations } from "@/lib/noviny/types";
import { listNovinyContextTopics } from "@/lib/noviny/contextLayer";
import { translateTextToCzech } from "@/lib/noviny/translation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Noviny | Verox",
  description: "Výběr článků Verox Noviny s odkazem na původní zdroj.",
  alternates: {
    canonical: `${SITE_URL}/noviny`,
  },
  openGraph: {
    title: "Noviny | Verox",
    description: "Přehled externích i vlastních článků Veroxu.",
    url: `${SITE_URL}/noviny`,
    type: "website",
  },
};

function hasUsefulSourceText(article: NovinyArticleWithRelations): boolean {
  const metadata = article.metadata ?? {};
  const sourceText = typeof metadata.summary_source_text === "string" ? metadata.summary_source_text.trim() : "";
  return sourceText.length >= 180;
}

async function enrichArticlesFromOrigin(articles: NovinyArticleWithRelations[]): Promise<NovinyArticleWithRelations[]> {
  const maxToEnrich = 90;
  const targets = articles
    .filter((article) => !hasUsefulSourceText(article))
    .slice(0, maxToEnrich)
    .map((article) => article.id);
  if (targets.length === 0) return articles;
  const targetSet = new Set(targets);

  return Promise.all(
    articles.map(async (article) => {
      if (!targetSet.has(article.id)) return article;
      const metadata = await fetchOriginMetadata(article.original_url);
      if (!metadata) return article;

      const mergedMeta = { ...(article.metadata ?? {}) } as Record<string, unknown>;
      if (metadata.title) mergedMeta.preview_title = metadata.title;
      if (metadata.description) mergedMeta.preview_description = metadata.description;

      const currentSourceText =
        typeof mergedMeta.summary_source_text === "string" ? String(mergedMeta.summary_source_text) : "";
      const candidateSource = metadata.sourceText ?? metadata.description ?? "";
      if (candidateSource && candidateSource.length > currentSourceText.length) {
        mergedMeta.summary_source_text = candidateSource;
      }

      return {
        ...article,
        external_author: article.external_author ?? metadata.author,
        perex: article.perex ?? metadata.description,
        metadata: mergedMeta,
      };
    }),
  );
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  async function worker() {
    for (;;) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      results[index] = await mapper(items[index]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

async function translateMetadataField(
  metadata: Record<string, unknown>,
  key: string,
  maxLength?: number,
): Promise<string | null> {
  const value = metadata[key];
  if (typeof value !== "string" || value.trim().length === 0) return null;
  return translateTextToCzech(value, maxLength);
}

async function localizeForeignArticlesToCzech(
  articles: NovinyArticleWithRelations[],
): Promise<NovinyArticleWithRelations[]> {
  return mapWithConcurrency(articles, 6, async (article) => {
    if (isCzechOrSlovak(resolveArticleLanguage(article))) return article;

    const metadata = { ...(article.metadata ?? {}) } as Record<string, unknown>;
    const context = article.context ? { ...article.context } : null;
    const [
      translatedTitle,
      translatedPerex,
      translatedPreviewTitle,
      translatedPreviewDescription,
      translatedSummaryText,
      translatedContextSummary,
      translatedContextAttribution,
      translatedContextWhyImportant,
    ] = await Promise.all([
      translateTextToCzech(getVisibleArticleTitle(article), 500),
      getVisibleArticlePerex(article) ? translateTextToCzech(getVisibleArticlePerex(article) ?? "", 1200) : Promise.resolve(null),
      translateMetadataField(metadata, "preview_title", 500),
      translateMetadataField(metadata, "preview_description", 1200),
      translateMetadataField(metadata, "summary_source_text", 2400),
      context?.short_summary ? translateTextToCzech(context.short_summary, 1200) : Promise.resolve(null),
      context?.safe_attribution ? translateTextToCzech(context.safe_attribution, 1200) : Promise.resolve(null),
      context?.why_important ? translateTextToCzech(context.why_important, 1200) : Promise.resolve(null),
    ]);

    if (translatedPreviewTitle) metadata.preview_title = translatedPreviewTitle;
    if (translatedPreviewDescription) metadata.preview_description = translatedPreviewDescription;
    if (translatedSummaryText) metadata.summary_source_text = translatedSummaryText;
    if (context && translatedContextSummary) context.short_summary = translatedContextSummary;
    if (context && translatedContextAttribution) context.safe_attribution = translatedContextAttribution;
    if (context && translatedContextWhyImportant) context.why_important = translatedContextWhyImportant;

    return {
      ...article,
      edited_title: translatedTitle ?? article.edited_title,
      edited_perex: translatedPerex ?? article.edited_perex,
      metadata,
      context,
    };
  });
}

export default async function NovinyPage() {
  let articlesError: string | null = null;

  const supabase = createNovinyPublicClient();

  const [firstArticlesResult] = await Promise.allSettled([listPublicNovinyArticles(supabase, { limit: 250 })]);
  const firstArticles = firstArticlesResult.status === "fulfilled" ? firstArticlesResult.value : [];

  let articles = firstArticles;
  if (articles.length === 0) {
    try {
      await runNovinyImport({ runType: "api" });
      const secondTry = await listPublicNovinyArticles(supabase, { limit: 250 });
      articles = secondTry;
    } catch (error) {
      articlesError = error instanceof Error ? error.message : "Automatický import Novin selhal.";
    }
  } else if (firstArticlesResult.status === "rejected") {
    articlesError = firstArticlesResult.reason instanceof Error ? firstArticlesResult.reason.message : "Články se nepodařilo načíst.";
  }

  const enrichedArticles = await enrichArticlesFromOrigin(articles);
  const localizedArticles = await localizeForeignArticlesToCzech(enrichedArticles);
  const ranked = rankNovinyArticles(localizedArticles);
  const domesticArticles = ranked.filter((article) => isCzechOrSlovak(resolveArticleLanguage(article)));
  const foreignArticles = ranked.filter((article) => !isCzechOrSlovak(resolveArticleLanguage(article)));
  const contextTopics = await listNovinyContextTopics(supabase, 10);

  return (
    <main className="mx-auto w-full max-w-[1240px] px-4 py-8 text-abj-text1 md:py-12">
      {articlesError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p>Nepodařilo se načíst články: {articlesError}</p>
        </div>
      ) : null}

      <div className="space-y-8">
        <NovinyContextTopics topics={contextTopics} />
        {ranked.length === 0 ? (
          <div className="rounded-2xl border border-[var(--abj-gold-dim)] bg-white p-6 text-base text-abj-text2">
            Zatím nejsou k dispozici žádné publikované články. Otevři prosím <strong>/admin/noviny</strong> a spusť
            ruční refresh.
          </div>
        ) : (
          <NovinyArticleFeed domesticArticles={domesticArticles} foreignArticles={foreignArticles} />
        )}
      </div>
    </main>
  );
}

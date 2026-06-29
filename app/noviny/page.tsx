import type { Metadata } from "next";
import Link from "next/link";

import { NovinyArticleFeed } from "@/app/noviny/_components/NovinyArticleFeed";
import {
  getVisibleArticlePerex,
  getVisibleArticleTitle,
  isCzechOrSlovak,
  resolveArticleLanguage,
} from "@/lib/noviny/public";
import { fetchOriginMetadata } from "@/lib/noviny/originMetadata";
import { createNovinyServiceClient, listPublicNovinyArticles, createNovinyPublicClient } from "@/lib/noviny/repository";
import { rankNovinyArticles } from "@/lib/noviny/ranking";
import { runNovinyImport } from "@/lib/noviny/importer";
import { SITE_URL } from "@/lib/site";
import type { NovinyArticleWithRelations } from "@/lib/noviny/types";
import { translateTextToCzech } from "@/lib/noviny/translation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isNazoryAdmin } from "@/lib/nazory/access";

export const dynamic = "force-dynamic";

const STALE_IMPORT_AFTER_MS = 25 * 60 * 1000;

export const metadata: Metadata = {
  title: "Zprávy | Verox",
  description: "Výběr zpráv Verox s odkazem na původní zdroj.",
  alternates: {
    canonical: `${SITE_URL}/noviny`,
  },
  openGraph: {
    title: "Zprávy | Verox",
    description: "Přehled externích i vlastních zpráv Veroxu.",
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

async function canShowNovinyAdminControls(): Promise<boolean> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user ? isNazoryAdmin(supabase, user) : false;
  } catch {
    return false;
  }
}

function shouldAttemptPageStaleImport(): boolean {
  const explicit = process.env.NOVINY_PAGE_STALE_IMPORT?.trim().toLowerCase();
  if (explicit === "true" || explicit === "1" || explicit === "yes") return true;
  if (explicit === "false" || explicit === "0" || explicit === "no") return false;
  return process.env.VERCEL_ENV !== "production";
}

function latestArticleImportAt(articles: NovinyArticleWithRelations[]): string | null {
  let latestTs = 0;
  for (const article of articles) {
    const ts = new Date(article.imported_at).getTime();
    if (Number.isFinite(ts) && ts > latestTs) latestTs = ts;
  }
  return latestTs > 0 ? new Date(latestTs).toISOString() : null;
}

async function latestFetchLogAt(): Promise<string | null> {
  try {
    const service = createNovinyServiceClient();
    const { data, error } = await service
      .from("noviny_fetch_logs")
      .select("fetched_at")
      .order("fetched_at", { ascending: false })
      .limit(1);
    if (error) return null;
    const value = ((data ?? [])[0] as { fetched_at?: string } | undefined)?.fetched_at;
    return value ?? null;
  } catch {
    return null;
  }
}

function isImportStale(value: string | null): boolean {
  if (!value) return true;
  const ts = new Date(value).getTime();
  if (!Number.isFinite(ts)) return true;
  return Date.now() - ts > STALE_IMPORT_AFTER_MS;
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
  } else if (shouldAttemptPageStaleImport()) {
    try {
      const latestImport = (await latestFetchLogAt()) ?? latestArticleImportAt(articles);
      if (isImportStale(latestImport)) {
        await runNovinyImport({ runType: "api" });
        articles = await listPublicNovinyArticles(supabase, { limit: 250 });
      }
    } catch (error) {
      articlesError = error instanceof Error ? error.message : "Automatický refresh Novin selhal.";
    }
  } else if (firstArticlesResult.status === "rejected") {
    articlesError = firstArticlesResult.reason instanceof Error ? firstArticlesResult.reason.message : "Články se nepodařilo načíst.";
  }

  const enrichedArticles = await enrichArticlesFromOrigin(articles);
  const localizedArticles = await localizeForeignArticlesToCzech(enrichedArticles);
  const ranked = rankNovinyArticles(localizedArticles);
  const domesticArticles = ranked.filter((article) => isCzechOrSlovak(resolveArticleLanguage(article)));
  const foreignArticles = ranked.filter((article) => !isCzechOrSlovak(resolveArticleLanguage(article)));
  const showAdminControls = await canShowNovinyAdminControls();

  return (
    <main className="mx-auto w-full max-w-[1240px] px-4 py-8 text-abj-text1 md:py-12">
      {articlesError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p>Nepodařilo se načíst články: {articlesError}</p>
        </div>
      ) : null}

      <div className="space-y-8">
        {showAdminControls ? (
          <section className="rounded-2xl border border-[#FF6A00]/25 bg-[#FF6A00]/5 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#B04A00]">Admin Noviny</p>
                <p className="mt-1 text-sm text-abj-text2">
                  Přidání nebo vypnutí RSS zdrojů/kanálů a ruční refresh článků.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/admin/noviny/zdroje"
                  className="inline-flex min-h-10 items-center rounded-xl border border-[#FF6A00]/40 bg-white px-4 py-2 text-sm font-bold text-[#B04A00] hover:bg-[#FF6A00]/10"
                >
                  Přidat zdroj/kanál
                </Link>
                <Link
                  href="/admin/noviny"
                  className="inline-flex min-h-10 items-center rounded-xl border border-[var(--abj-gold-dim)] bg-white px-4 py-2 text-sm font-bold text-abj-text1 hover:border-[#FF6A00]/35"
                >
                  Správa Novin
                </Link>
              </div>
            </div>
          </section>
        ) : null}
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

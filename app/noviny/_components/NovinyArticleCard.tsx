"use client";

import Link from "next/link";

import { NovinyArticleActions } from "@/app/noviny/_components/NovinyArticleActions";
import { getDictionary } from "@/lib/i18n/dictionary";
import { useLocale } from "@/lib/i18n/useLocale";
import {
  formatNovinyDate,
  getArticleAuthor,
  getArticlePreviewDescription,
  getArticlePreviewTitle,
  getDisplayTags,
  getVisibleArticlePerex,
  getVisibleArticleTitle,
  sourceLabel,
} from "@/lib/noviny/public";
import { SITE_URL } from "@/lib/site";
import type { NovinyArticleWithRelations } from "@/lib/noviny/types";

type NovinyArticleCardProps = {
  article: NovinyArticleWithRelations;
  compact?: boolean;
};

export function NovinyArticleCard({ article, compact = false }: NovinyArticleCardProps) {
  const locale = useLocale();
  const dictionary = getDictionary(locale);
  const title = getVisibleArticleTitle(article);
  const previewTitle = getArticlePreviewTitle(article);
  const previewDescription = getArticlePreviewDescription(article);
  const perex = getVisibleArticlePerex(article);
  const author = getArticleAuthor(article);
  const tags = Array.from(new Set([...getDisplayTags(article), ...(article.context?.suggested_tags ?? [])])).slice(0, 8);
  const approvedEnrichment = article.enrichment?.ai_status === "approved" ? article.enrichment : null;
  const bullets = approvedEnrichment?.ai_summary_5_points ?? [];
  const enrichmentAttribution = approvedEnrichment
    ? `Podle serveru ${article.source?.name ?? "původního zdroje"} článek uvádí:`
    : null;
  const shareUrl = `${SITE_URL}/noviny#noviny-article-${article.id}`;
  const previewImageUrl = article.image_url ? article.image_url.replace(/"/g, "%22") : null;
  let articleHost = "";
  try {
    articleHost = new URL(article.original_url).host.replace(/^www\./i, "");
  } catch {
    articleHost = "";
  }

  return (
    <article
      id={`noviny-article-${article.id}`}
      className={`scroll-mt-24 rounded-3xl border border-[var(--abj-gold-dim)] bg-white shadow-sm ${compact ? "p-4 md:p-5" : "p-5 md:p-6"}`}
    >
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-abj-text2">
        <span className="rounded-full bg-[rgba(255,106,0,0.12)] px-2.5 py-1 text-[#B04A00]">
          {sourceLabel(article)}
        </span>
        {author ? <span className="rounded-full border border-[var(--abj-gold-dim)] bg-[var(--abj-panel)] px-2.5 py-1">{dictionary.news.author}: {author}</span> : null}
      </div>

      <h2 className={`mt-3 font-bold leading-tight text-abj-text1 ${compact ? "text-xl md:text-2xl" : "text-2xl md:text-3xl"}`}>{title}</h2>

      {previewImageUrl ? (
        <section className="mt-3 overflow-hidden rounded-2xl border border-[var(--abj-gold-dim)] bg-[var(--abj-panel)]">
          <div
            className="h-28 w-full md:h-36"
            style={{
              backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.12), rgba(0,0,0,0.45)), url("${previewImageUrl}")`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          <div className="border-t border-[var(--abj-gold-dim)] px-3 py-2 text-xs text-abj-text2">
            <p className="font-semibold uppercase tracking-[0.08em]">{dictionary.news.originalPreview}</p>
            <p className="mt-1 line-clamp-2 text-sm font-semibold text-abj-text1">{previewTitle}</p>
            {previewDescription ? <p className="mt-1 line-clamp-3 text-xs text-abj-text2">{previewDescription}</p> : null}
            <p className="mt-0.5 truncate">{articleHost || article.original_url}</p>
          </div>
        </section>
      ) : null}

      {perex ? (
        <p className={`mt-3 leading-7 text-abj-text1/90 ${compact ? "text-sm md:text-base" : "text-base md:text-lg"}`}>
          {perex}
        </p>
      ) : null}

      {tags.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <li
              key={`${article.id}-${tag}`}
              className="rounded-full border border-[var(--abj-gold-dim)] bg-[var(--abj-panel)] px-2.5 py-1 text-xs font-semibold text-abj-text2"
            >
              #{tag}
            </li>
          ))}
        </ul>
      ) : null}

      {approvedEnrichment && bullets.length === 5 && enrichmentAttribution ? (
        <section className="mt-3 rounded-2xl border border-[#FF6A00]/20 bg-[#FF6A00]/5 p-3">
          <p className="text-sm font-semibold text-[#B04A00]">{enrichmentAttribution}</p>
          <ul className={`mt-2 space-y-2 text-abj-text1/90 ${compact ? "text-sm md:text-base" : "text-base md:text-lg"}`}>
            {bullets.map((bullet) => (
              <li key={`${article.id}-${bullet.slice(0, 24)}`} className="flex gap-2 leading-7">
                <span className="mt-[0.45rem] h-1.5 w-1.5 flex-none rounded-full bg-[#FF6A00]" aria-hidden="true" />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
          {approvedEnrichment.ai_why_it_matters && !compact ? (
            <p className="mt-3 text-sm leading-6 text-abj-text2">{approvedEnrichment.ai_why_it_matters}</p>
          ) : null}
        </section>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-abj-text2">{formatNovinyDate(article.published_at, locale === "en" ? "en-US" : "cs-CZ")}</p>
        <Link
          href={article.original_url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="inline-flex min-h-11 items-center rounded-xl border border-[#FF6A00]/40 bg-[#FF6A00]/10 px-4 py-2 text-base font-bold text-[#B04A00] hover:bg-[#FF6A00]/15"
        >
          {dictionary.news.readOriginal}
        </Link>
      </div>
      <NovinyArticleActions
        articleId={article.id}
        title={title}
        sourceName={article.source?.name ?? null}
        originalUrl={article.original_url}
        imageUrl={article.image_url}
        publishedAt={article.published_at}
        shareUrl={shareUrl}
        compact={compact}
      />
    </article>
  );
}

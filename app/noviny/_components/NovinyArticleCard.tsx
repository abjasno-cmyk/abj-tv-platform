import Link from "next/link";

import {
  buildTranslateToCzechUrl,
  formatNovinyDate,
  getArticleAuthor,
  getArticleSummaryBullets,
  getDisplayTags,
  getVisibleArticleTitle,
  shouldUseAutoTranslation,
  sourceLabel,
} from "@/lib/noviny/public";
import type { NovinyArticleWithRelations } from "@/lib/noviny/types";

type NovinyArticleCardProps = {
  article: NovinyArticleWithRelations;
  compact?: boolean;
};

export function NovinyArticleCard({ article, compact = false }: NovinyArticleCardProps) {
  const title = getVisibleArticleTitle(article);
  const author = getArticleAuthor(article);
  const tags = getDisplayTags(article);
  const bullets = getArticleSummaryBullets(article);
  const translatedView = shouldUseAutoTranslation(article);
  const outboundUrl = translatedView ? buildTranslateToCzechUrl(article.original_url) : article.original_url;
  const outboundLabel = translatedView ? "Otevřít originál (automatický CZ překlad)" : "Přejít na původní článek";

  return (
    <article className={`rounded-3xl border border-[var(--abj-gold-dim)] bg-white shadow-sm ${compact ? "p-4 md:p-5" : "p-5 md:p-6"}`}>
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-abj-text2">
        <span className="rounded-full bg-[rgba(255,106,0,0.12)] px-2.5 py-1 text-[#B04A00]">
          {sourceLabel(article)}
        </span>
        {author ? <span className="rounded-full border border-[var(--abj-gold-dim)] bg-[var(--abj-panel)] px-2.5 py-1">Autor: {author}</span> : null}
      </div>

      <h2 className={`mt-3 font-bold leading-tight text-abj-text1 ${compact ? "text-xl md:text-2xl" : "text-2xl md:text-3xl"}`}>{title}</h2>

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

      <ul className={`mt-3 space-y-2 text-abj-text1/90 ${compact ? "text-sm md:text-base" : "text-base md:text-lg"}`}>
        {bullets.slice(0, compact ? 3 : 5).map((bullet) => (
          <li key={`${article.id}-${bullet.slice(0, 24)}`} className="flex gap-2 leading-7">
            <span className="mt-[0.45rem] h-1.5 w-1.5 flex-none rounded-full bg-[#FF6A00]" aria-hidden="true" />
            <span>{bullet}</span>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-abj-text2">{formatNovinyDate(article.published_at)}</p>
        <Link
          href={outboundUrl}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="inline-flex min-h-11 items-center rounded-xl border border-[#FF6A00]/40 bg-[#FF6A00]/10 px-4 py-2 text-base font-bold text-[#B04A00] hover:bg-[#FF6A00]/15"
        >
          {outboundLabel}
        </Link>
      </div>
    </article>
  );
}

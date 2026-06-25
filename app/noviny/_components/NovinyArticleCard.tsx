import Link from "next/link";

import { formatNovinyDate, getVisibleArticlePerex, getVisibleArticleTitle } from "@/lib/noviny/public";
import type { RankedNovinyArticle } from "@/lib/noviny/ranking";
import type { NovinyArticleWithRelations } from "@/lib/noviny/types";

type NovinyArticleCardProps = {
  article: NovinyArticleWithRelations | RankedNovinyArticle;
  compact?: boolean;
};

function hasRanking(article: NovinyArticleWithRelations | RankedNovinyArticle): article is RankedNovinyArticle {
  return "ranking" in article;
}

export function NovinyArticleCard({ article, compact = false }: NovinyArticleCardProps) {
  const title = getVisibleArticleTitle(article);
  const perex = getVisibleArticlePerex(article);
  const ranked = hasRanking(article) ? article.ranking : null;

  return (
    <article className={`rounded-3xl border border-[var(--abj-gold-dim)] bg-white shadow-sm ${compact ? "p-4 md:p-5" : "p-5 md:p-6"}`}>
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-abj-text2">
        <span className="rounded-full bg-[rgba(255,106,0,0.12)] px-2.5 py-1 text-[#B04A00]">
          {article.category?.name ?? "Bez kategorie"}
        </span>
        {ranked ? (
          <span className="rounded-full border border-[var(--abj-gold-dim)] bg-[var(--abj-panel)] px-2.5 py-1 text-abj-text2">
            Relevance {ranked.total}/100
          </span>
        ) : null}
      </div>

      <h2 className={`mt-3 font-bold leading-tight text-abj-text1 ${compact ? "text-xl md:text-2xl" : "text-2xl md:text-3xl"}`}>{title}</h2>

      {perex ? <p className={`mt-3 leading-7 text-abj-text1/90 ${compact ? "text-sm md:text-base" : "text-base md:text-lg"}`}>{perex}</p> : null}

      {ranked ? (
        <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-abj-text2 md:grid-cols-4">
          <div className="rounded-lg border border-[var(--abj-gold-dim)] bg-[var(--abj-panel)] px-2 py-1.5">
            <dt className="font-semibold uppercase tracking-[0.08em]">Novost</dt>
            <dd>{ranked.novelty}</dd>
          </div>
          <div className="rounded-lg border border-[var(--abj-gold-dim)] bg-[var(--abj-panel)] px-2 py-1.5">
            <dt className="font-semibold uppercase tracking-[0.08em]">Závažnost</dt>
            <dd>{ranked.severity}</dd>
          </div>
          <div className="rounded-lg border border-[var(--abj-gold-dim)] bg-[var(--abj-panel)] px-2 py-1.5">
            <dt className="font-semibold uppercase tracking-[0.08em]">Zajímavost</dt>
            <dd>{ranked.interest}</dd>
          </div>
          <div className="rounded-lg border border-[var(--abj-gold-dim)] bg-[var(--abj-panel)] px-2 py-1.5">
            <dt className="font-semibold uppercase tracking-[0.08em]">Neuro aspekt</dt>
            <dd>{ranked.neuro}</dd>
          </div>
        </dl>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-abj-text2">{formatNovinyDate(article.published_at)}</p>
        <Link
          href={article.original_url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="inline-flex min-h-11 items-center rounded-xl border border-[#FF6A00]/40 bg-[#FF6A00]/10 px-4 py-2 text-base font-bold text-[#B04A00] hover:bg-[#FF6A00]/15"
        >
          Přejít na původní článek
        </Link>
      </div>
    </article>
  );
}

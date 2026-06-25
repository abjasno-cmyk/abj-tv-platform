import Link from "next/link";

import { formatNovinyDate, getVisibleArticlePerex, getVisibleArticleTitle, sourceLabel } from "@/lib/noviny/public";
import type { NovinyArticleWithRelations } from "@/lib/noviny/types";

type NovinyArticleCardProps = {
  article: NovinyArticleWithRelations;
};

export function NovinyArticleCard({ article }: NovinyArticleCardProps) {
  const title = getVisibleArticleTitle(article);
  const perex = getVisibleArticlePerex(article);

  return (
    <article className="rounded-3xl border border-[var(--abj-gold-dim)] bg-white p-5 shadow-sm md:p-6">
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-abj-text2">
        <span className="rounded-full bg-[rgba(255,106,0,0.12)] px-2.5 py-1 text-[#B04A00]">
          {article.category?.name ?? "Bez kategorie"}
        </span>
        <span>•</span>
        <span>{sourceLabel(article)}</span>
      </div>

      <h2 className="mt-3 text-2xl font-bold leading-tight text-abj-text1 md:text-3xl">{title}</h2>

      {perex ? <p className="mt-3 text-base leading-7 text-abj-text1/90 md:text-lg">{perex}</p> : null}

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

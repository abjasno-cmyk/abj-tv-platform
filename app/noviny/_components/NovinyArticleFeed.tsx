"use client";

import { useState } from "react";

import { NovinyArticleCard } from "@/app/noviny/_components/NovinyArticleCard";
import type { RankedNovinyArticle } from "@/lib/noviny/ranking";

type FeedMode = "domaci" | "zahranicni";

type NovinyArticleFeedProps = {
  domesticArticles: RankedNovinyArticle[];
  foreignArticles: RankedNovinyArticle[];
};

function ArticleSections({ articles }: { articles: RankedNovinyArticle[] }) {
  const lead = articles[0] ?? null;
  const secondary = articles.slice(1, 7);
  const deepRead = articles.slice(7);

  if (articles.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--abj-gold-dim)] bg-white p-6 text-base text-abj-text2">
        V této části zatím nejsou k dispozici žádné publikované články.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {lead ? (
        <section className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-abj-text2">Hlavní výběr</h2>
          <NovinyArticleCard article={lead} />
        </section>
      ) : null}

      {secondary.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-abj-text2">Doporučené články</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {secondary.map((article) => (
              <NovinyArticleCard key={article.id} article={article} compact />
            ))}
          </div>
        </section>
      ) : null}

      {deepRead.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-abj-text2">Další čtení</h2>
          <div className="space-y-4">
            {deepRead.map((article) => (
              <NovinyArticleCard key={article.id} article={article} compact />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

export function NovinyArticleFeed({ domesticArticles, foreignArticles }: NovinyArticleFeedProps) {
  const [mode, setMode] = useState<FeedMode>("domaci");
  const activeArticles = mode === "domaci" ? domesticArticles : foreignArticles;

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--abj-gold-dim)] bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-abj-text2">Zobrazeno článků: {activeArticles.length}</p>
          <p className="mt-1 text-xs text-abj-text2">
            Domácí výběr obsahuje české a slovenské zdroje společně. Zahraniční zdroje jsou oddělené.
          </p>
        </div>
        <div className="inline-flex rounded-full border border-[var(--abj-gold-dim)] bg-[var(--abj-panel)] p-1">
          <button
            type="button"
            onClick={() => setMode("domaci")}
            className={`rounded-full px-4 py-2 text-sm font-bold ${
              mode === "domaci" ? "bg-[#FF6A00] text-white" : "text-abj-text2 hover:text-abj-text1"
            }`}
            aria-pressed={mode === "domaci"}
          >
            Domácí ({domesticArticles.length})
          </button>
          <button
            type="button"
            onClick={() => setMode("zahranicni")}
            className={`rounded-full px-4 py-2 text-sm font-bold ${
              mode === "zahranicni" ? "bg-[#FF6A00] text-white" : "text-abj-text2 hover:text-abj-text1"
            }`}
            aria-pressed={mode === "zahranicni"}
          >
            Zahraniční ({foreignArticles.length})
          </button>
        </div>
      </div>

      <ArticleSections articles={activeArticles} />
    </section>
  );
}

import type { Metadata } from "next";

import { NovinyArticleCard } from "@/app/noviny/_components/NovinyArticleCard";
import { getVisibleArticlePerex, getVisibleArticleTitle, isCzechOrSlovak } from "@/lib/noviny/public";
import { listPublicNovinyArticles, createNovinyPublicClient } from "@/lib/noviny/repository";
import { rankNovinyArticles } from "@/lib/noviny/ranking";
import { runNovinyImport } from "@/lib/noviny/importer";
import { SITE_URL } from "@/lib/site";
import { translateTextToCzech } from "@/lib/noviny/translation";
import type { NovinyArticleWithRelations } from "@/lib/noviny/types";

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

async function localizeArticlesToCzech(articles: NovinyArticleWithRelations[]): Promise<NovinyArticleWithRelations[]> {
  return Promise.all(
    articles.map(async (article) => {
      if (isCzechOrSlovak(article.language)) return article;
      if (article.edited_title?.trim() || article.edited_perex?.trim()) return article;

      const titleInput = getVisibleArticleTitle(article);
      const perexInput = getVisibleArticlePerex(article) ?? "";
      const [translatedTitle, translatedPerex] = await Promise.all([
        translateTextToCzech(titleInput),
        perexInput ? translateTextToCzech(perexInput) : Promise.resolve(null),
      ]);

      return {
        ...article,
        edited_title: translatedTitle ?? article.edited_title,
        edited_perex: translatedPerex ?? article.edited_perex,
      };
    }),
  );
}

export default async function NovinyPage() {
  let articlesError: string | null = null;

  const supabase = createNovinyPublicClient();

  const [firstArticlesResult] = await Promise.allSettled([listPublicNovinyArticles(supabase, { limit: 140 })]);
  const firstArticles = firstArticlesResult.status === "fulfilled" ? firstArticlesResult.value : [];

  let articles = firstArticles;
  if (articles.length === 0) {
    try {
      await runNovinyImport({ runType: "api" });
      const secondTry = await listPublicNovinyArticles(supabase, { limit: 140 });
      articles = secondTry;
    } catch (error) {
      articlesError = error instanceof Error ? error.message : "Automatický import Novin selhal.";
    }
  } else if (firstArticlesResult.status === "rejected") {
    articlesError = firstArticlesResult.reason instanceof Error ? firstArticlesResult.reason.message : "Články se nepodařilo načíst.";
  }

  const localizedArticles = await localizeArticlesToCzech(articles);
  const ranked = rankNovinyArticles(localizedArticles);
  const lead = ranked[0] ?? null;
  const secondary = ranked.slice(1, 5);
  const deepRead = ranked.slice(5, 24);

  return (
    <main className="mx-auto w-full max-w-[1240px] px-4 py-8 text-abj-text1 md:py-12">
      {articlesError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p>Nepodařilo se načíst články: {articlesError}</p>
        </div>
      ) : null}

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

        <section className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-abj-text2">Další čtení</h2>
          {deepRead.length === 0 && !lead ? (
            <div className="rounded-2xl border border-[var(--abj-gold-dim)] bg-white p-6 text-base text-abj-text2">
              Zatím nejsou k dispozici žádné publikované články. Otevři prosím <strong>/admin/noviny</strong> a spusť
              ruční refresh.
            </div>
          ) : (
            <div className="space-y-4">
              {deepRead.map((article) => (
                <NovinyArticleCard key={article.id} article={article} compact />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

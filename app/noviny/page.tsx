import type { Metadata } from "next";

import { NovinyArticleCard } from "@/app/noviny/_components/NovinyArticleCard";
import { NovinySourceList } from "@/app/noviny/_components/NovinySourceList";
import { listPublicNovinyArticles, listPublicNovinySources, createNovinyPublicClient } from "@/lib/noviny/repository";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Noviny | Verox",
  description: "Přehled externích i vlastních článků Veroxu. Obsahuje pouze metadata a odkaz na původní zdroj.",
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

export default async function NovinyPage() {
  let sourcesError: string | null = null;
  let articlesError: string | null = null;

  const supabase = createNovinyPublicClient();

  const [sourcesResult, articlesResult] = await Promise.allSettled([
    listPublicNovinySources(supabase, 120),
    listPublicNovinyArticles(supabase, { limit: 80 }),
  ]);

  const sources = sourcesResult.status === "fulfilled" ? sourcesResult.value : [];
  const articles = articlesResult.status === "fulfilled" ? articlesResult.value : [];

  if (sourcesResult.status === "rejected") {
    sourcesError = sourcesResult.reason instanceof Error ? sourcesResult.reason.message : "Zdroje se nepodařilo načíst.";
  }
  if (articlesResult.status === "rejected") {
    articlesError = articlesResult.reason instanceof Error ? articlesResult.reason.message : "Články se nepodařilo načíst.";
  }

  return (
    <main className="mx-auto w-full max-w-[1240px] px-4 py-8 text-abj-text1 md:py-12">
      <header className="rounded-3xl border border-[var(--abj-gold-dim)] bg-abj-panel p-6 md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-abj-text2">Verox Noviny</p>
        <h1 className="mt-2 text-4xl font-black leading-tight md:text-5xl">Informační uzel s odkazy na původní zdroje</h1>
        <p className="mt-3 max-w-3xl text-lg leading-8 text-abj-text1/90">
          Noviny nepublikují plné přepisy cizích článků. U každé položky najdete titulek, datum, zdroj, krátký perex a
          přímý odkaz na originál.
        </p>
      </header>

      {sourcesError || articlesError ? (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {sourcesError ? <p>Nepodařilo se načíst zdroje: {sourcesError}</p> : null}
          {articlesError ? <p>Nepodařilo se načíst články: {articlesError}</p> : null}
        </div>
      ) : null}

      <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-5">
          {articles.length === 0 ? (
            <div className="rounded-2xl border border-[var(--abj-gold-dim)] bg-white p-6 text-base text-abj-text2">
              Zatím nejsou k dispozici žádné publikované články.
            </div>
          ) : (
            articles.map((article) => <NovinyArticleCard key={article.id} article={article} />)
          )}
        </section>

        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <NovinySourceList sources={sources} />
        </aside>
      </div>
    </main>
  );
}

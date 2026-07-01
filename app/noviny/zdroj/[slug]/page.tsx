import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { NovinyArticleCard } from "@/app/noviny/_components/NovinyArticleCard";
import { SavedNovinyProvider } from "@/app/noviny/_components/SavedNovinyProvider";
import { NovinySourceList } from "@/app/noviny/_components/NovinySourceList";
import {
  createNovinyPublicClient,
  getPublicSourceBySlug,
  listPublicNovinyArticles,
  listPublicNovinySources,
} from "@/lib/noviny/repository";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createNovinyPublicClient();
  const source = await getPublicSourceBySlug(supabase, slug);
  if (!source) {
    return {
      title: "Zdroj nenalezen | Verox Noviny",
    };
  }

  const title = `${source.name} | Verox Noviny`;
  const description = `Přehled článků ze zdroje ${source.name} v sekci Noviny.`;
  return {
    title,
    description,
    alternates: {
      canonical: `${SITE_URL}/noviny/zdroj/${source.slug}`,
    },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/noviny/zdroj/${source.slug}`,
      type: "website",
    },
  };
}

export default async function NovinySourcePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createNovinyPublicClient();

  const [sourceResult, sourcesResult] = await Promise.all([
    getPublicSourceBySlug(supabase, slug),
    listPublicNovinySources(supabase, 120),
  ]);

  const source = sourceResult;
  if (!source) notFound();

  const articles = await listPublicNovinyArticles(supabase, { sourceId: source.id, limit: 120 });

  return (
    <main className="mx-auto w-full max-w-[1240px] px-4 py-8 text-abj-text1 md:py-12">
      <nav className="mb-4 text-sm text-abj-text2">
        <Link href="/noviny" className="font-semibold hover:text-abj-text1">
          ← Zpět na Noviny
        </Link>
      </nav>

      <header className="rounded-3xl border border-[var(--abj-gold-dim)] bg-abj-panel p-6 md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-abj-text2">Zdroj</p>
        <h1 className="mt-2 text-4xl font-black leading-tight md:text-5xl">{source.name}</h1>
        <p className="mt-3 text-base text-abj-text2">
          {source.language ? `${source.language.toUpperCase()} · ` : ""}
          {source.country ?? "Mezinárodní"}
        </p>
        {source.homepage_url ? (
          <a
            href={source.homepage_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex min-h-11 items-center rounded-xl border border-[var(--abj-gold-dim)] bg-white px-4 py-2 text-sm font-semibold text-abj-text1 hover:border-[#FF6A00]/35"
          >
            Otevřít web zdroje
          </a>
        ) : null}
      </header>

      <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-5">
          {articles.length === 0 ? (
            <div className="rounded-2xl border border-[var(--abj-gold-dim)] bg-white p-6 text-base text-abj-text2">
              Tento zdroj zatím nemá žádné publikované články.
            </div>
          ) : (
            <SavedNovinyProvider>
              {articles.map((article) => (
                <NovinyArticleCard key={article.id} article={article} />
              ))}
            </SavedNovinyProvider>
          )}
        </section>
        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <NovinySourceList sources={sourcesResult} activeSlug={source.slug} />
        </aside>
      </div>
    </main>
  );
}

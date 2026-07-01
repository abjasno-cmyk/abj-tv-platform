import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { NovinyArticleCard } from "@/app/noviny/_components/NovinyArticleCard";
import { SavedNovinyProvider } from "@/app/noviny/_components/SavedNovinyProvider";
import { getNovinyTopicPage } from "@/lib/noviny/contextLayer";
import { createNovinyPublicClient } from "@/lib/noviny/repository";
import { SITE_URL } from "@/lib/site";

type TopicPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: TopicPageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createNovinyPublicClient();
  const data = await getNovinyTopicPage(supabase, slug);
  if (!data) {
    return {
      title: "Téma nenalezeno | Noviny | Verox",
    };
  }

  return {
    title: `${data.topic.name} | Noviny | Verox`,
    description: data.topic.description ?? `Tematický kontext Novin: ${data.topic.name}.`,
    alternates: {
      canonical: `${SITE_URL}/noviny/tema/${data.topic.slug}`,
    },
    openGraph: {
      title: `${data.topic.name} | Noviny | Verox`,
      description: data.topic.description ?? `Tematický kontext Novin: ${data.topic.name}.`,
      url: `${SITE_URL}/noviny/tema/${data.topic.slug}`,
      type: "website",
    },
  };
}

export default async function NovinyTopicPage({ params }: TopicPageProps) {
  const { slug } = await params;
  const supabase = createNovinyPublicClient();
  const data = await getNovinyTopicPage(supabase, slug);
  if (!data) notFound();

  return (
    <main className="mx-auto w-full max-w-[1120px] px-4 py-8 text-abj-text1 md:py-12">
      <Link href="/noviny" className="text-sm font-semibold text-[#B04A00] hover:text-[#FF6A00]">
        ← Zpět na Noviny
      </Link>

      <header className="mt-4 rounded-2xl border border-[var(--abj-gold-dim)] bg-white p-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-abj-text2">Kontext 2.0</p>
        <h1 className="mt-2 text-3xl font-semibold text-abj-text1">{data.topic.name}</h1>
        {data.topic.description ? <p className="mt-3 max-w-3xl text-base text-abj-text2">{data.topic.description}</p> : null}
      </header>

      <section className="mt-8 space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-abj-text2">Související články</h2>
        {data.articles.length === 0 ? (
          <div className="rounded-2xl border border-[var(--abj-gold-dim)] bg-white p-6 text-sm text-abj-text2">
            Pro toto téma zatím nejsou dostupné žádné publikované články.
          </div>
        ) : (
          <SavedNovinyProvider>
            {data.articles.map((article) => (
              <NovinyArticleCard key={article.id} article={article} compact />
            ))}
          </SavedNovinyProvider>
        )}
      </section>
    </main>
  );
}

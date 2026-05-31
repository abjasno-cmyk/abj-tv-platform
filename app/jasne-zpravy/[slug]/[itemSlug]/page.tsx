import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { StoryDetail } from "../../_components/StoryDetail";
import {
  createSupabaseNewsClient,
  fetchPublishedEditionBySlug,
  fetchPublishedItemsForEdition,
  fetchSourcesForItemIds,
  formatPragueDateAndTimeCompact,
  getItemSlug,
  groupSourcesByItemId,
  type NewsEdition,
} from "@/lib/jasne-zpravy";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; itemSlug: string }>;
}): Promise<Metadata> {
  const { slug, itemSlug } = await params;
  let supabase;
  try {
    supabase = createSupabaseNewsClient();
  } catch {
    return { title: "Jasné zprávy" };
  }

  const editionRes = await fetchPublishedEditionBySlug(supabase, slug);
  const edition = editionRes.data as NewsEdition | null;
  if (!edition) return { title: "Zpráva nenalezena — Jasné zprávy" };

  const itemsRes = await fetchPublishedItemsForEdition(supabase, edition.id);
  const item = (itemsRes.data ?? []).find((candidate) => getItemSlug(candidate) === itemSlug) ?? null;
  if (!item) return { title: "Zpráva nenalezena — Jasné zprávy" };

  const title = `${item.short_headline ?? item.headline} — Jasné zprávy`;
  const description = item.lead ?? item.why_it_matters ?? edition.subtitle ?? undefined;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ slug: string; itemSlug: string }>;
}) {
  const { slug, itemSlug } = await params;
  let supabase;
  try {
    supabase = createSupabaseNewsClient();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Neznámá chyba";
    return (
      <main className="mx-auto max-w-6xl bg-[#FBF8F2] px-4 py-12">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
          Nepodařilo se navázat připojení k datům Jasných zpráv: {message}
        </div>
      </main>
    );
  }

  const editionRes = await fetchPublishedEditionBySlug(supabase, slug);
  const edition = editionRes.data as NewsEdition | null;
  if (editionRes.error) {
    return (
      <main className="mx-auto max-w-6xl bg-[#FBF8F2] px-4 py-12">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
          Nepodařilo se načíst vydání: {editionRes.error.message}
        </div>
      </main>
    );
  }
  if (!edition) notFound();

  const itemsRes = await fetchPublishedItemsForEdition(supabase, edition.id);
  if (itemsRes.error) {
    return (
      <main className="mx-auto max-w-6xl bg-[#FBF8F2] px-4 py-12">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
          Nepodařilo se načíst zprávy vydání: {itemsRes.error.message}
        </div>
      </main>
    );
  }

  const items = itemsRes.data ?? [];
  const item = items.find((candidate) => getItemSlug(candidate) === itemSlug) ?? null;
  if (!item) notFound();

  const sourcesRes = await fetchSourcesForItemIds(supabase, [item.id]);
  if (sourcesRes.error) {
    return (
      <main className="mx-auto max-w-6xl bg-[#FBF8F2] px-4 py-12">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
          Nepodařilo se načíst zdroje zprávy: {sourcesRes.error.message}
        </div>
      </main>
    );
  }

  const sourcesByItem = groupSourcesByItemId(sourcesRes.data ?? []);

  return (
    <main className="mx-auto w-full max-w-[980px] bg-[#FBF8F2] px-4 py-8 text-verox-ink md:py-12">
      <nav className="mb-5 flex flex-wrap items-center gap-3">
        <Link href={`/jasne-zpravy/${edition.slug}`} className="vx-action">
          ← Zpět na vydání
        </Link>
        <span className="vx-meta">/</span>
        <span className="vx-meta">{formatPragueDateAndTimeCompact(edition.published_at ?? edition.generated_at)}</span>
      </nav>

      <StoryDetail
        item={item}
        edition={edition}
        sources={sourcesByItem.get(item.id) ?? []}
        sourcesByItem={sourcesByItem}
      />
    </main>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { StoryDetail } from "../_components/StoryDetail";
import {
  createSupabaseNewsClient,
  fetchAdjacentPublishedEditions,
  fetchPublishedEditionBySlug,
  fetchPublishedItemsForEdition,
  fetchSourcesForItemIds,
  formatPragueDateAndTimeCompact,
  formatPragueDateTime,
  getEditionTimestamp,
  getEditionTypeLabel,
  getItemSlug,
  getItemSourceCount,
  groupSourcesByItemId,
  type NewsEdition,
} from "@/lib/jasne-zpravy";

export const revalidate = 3600;

function itemRank(item: { rank: number | null }): number {
  return item.rank ?? Number.MAX_SAFE_INTEGER;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  let supabase;
  try {
    supabase = createSupabaseNewsClient();
  } catch {
    return { title: "Jasné zprávy" };
  }
  const editionRes = await fetchPublishedEditionBySlug(supabase, slug);
  const edition = editionRes.data as NewsEdition | null;

  if (!edition) return { title: "Vydání nenalezeno — Jasné zprávy" };

  const description = edition.subtitle ?? edition.summary ?? undefined;
  const title = `${edition.title} — Jasné zprávy`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      publishedTime: edition.published_at ?? undefined,
      siteName: "Jasné zprávy",
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function EditionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let supabase;
  try {
    supabase = createSupabaseNewsClient();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Neznámá chyba";
    return (
      <main className="mx-auto max-w-6xl px-4 py-12">
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
      <main className="mx-auto max-w-6xl px-4 py-12">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
          Nepodařilo se načíst vydání: {editionRes.error.message}
        </div>
      </main>
    );
  }
  if (!edition) notFound();

  const [itemsRes, adjacentRes] = await Promise.all([
    fetchPublishedItemsForEdition(supabase, edition.id),
    fetchAdjacentPublishedEditions(supabase, edition),
  ]);
  if (itemsRes.error) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-12">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
          Nepodařilo se načíst zprávy vydání: {itemsRes.error.message}
        </div>
      </main>
    );
  }

  const sortedItems = [...(itemsRes.data ?? [])].sort((a, b) => itemRank(a) - itemRank(b));
  const sourcesRes = await fetchSourcesForItemIds(
    supabase,
    sortedItems.map((item) => item.id),
  );
  if (sourcesRes.error) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-12">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
          Nepodařilo se načíst zdroje vydání: {sourcesRes.error.message}
        </div>
      </main>
    );
  }

  const sourcesByItem = groupSourcesByItemId(sourcesRes.data ?? []);
  const sourceLeaders = [...sortedItems]
    .sort(
      (a, b) =>
        getItemSourceCount(b, sourcesByItem) - getItemSourceCount(a, sourcesByItem) || itemRank(a) - itemRank(b),
    )
    .slice(0, 5);

  return (
    <main className="mx-auto w-full max-w-[1240px] px-4 py-8 text-[#111827] md:py-12">
      <nav className="mb-4 flex flex-wrap items-center gap-2 text-sm text-gray-500">
        <Link href="/jasne-zpravy" className="font-semibold hover:text-gray-900">
          ← Jasné zprávy
        </Link>
        <span>/</span>
        <Link href="/jasne-zpravy/archiv" className="hover:text-gray-900">
          Archiv
        </Link>
      </nav>

      <header className="mb-8 rounded-3xl border border-[#F37021]/20 bg-gradient-to-b from-[#fffaf3] via-[#fffdfa] to-white p-6 shadow-[0_12px_30px_rgba(17,17,17,0.06)] md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="rounded-full bg-[#F37021] px-3 py-1 text-xs font-bold uppercase tracking-[0.08em] text-white">
            {getEditionTypeLabel(edition.edition_type)} vydání
          </span>
          <time className="text-sm text-gray-500">{formatPragueDateTime(getEditionTimestamp(edition))}</time>
        </div>
        <h1 className="jz-headline-display mt-3 text-3xl font-black text-gray-950 md:text-5xl">{edition.title}</h1>
        {edition.subtitle ? <p className="jz-deck mt-3 text-lg">{edition.subtitle}</p> : null}
        {edition.summary ? <p className="jz-deck mt-3 max-w-3xl text-base">{edition.summary}</p> : null}
        <p className="mt-3 text-sm text-gray-600">{sortedItems.length} publikovaných zpráv</p>
      </header>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="min-w-0 space-y-6">
          {sortedItems.length === 0 ? (
            <p className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-600">
              Toto vydání zatím neobsahuje publikované zprávy.
            </p>
          ) : (
            sortedItems.map((item) => (
              <section id={getItemSlug(item)} key={item.id} className="scroll-mt-24">
                <StoryDetail
                  item={item}
                  edition={edition}
                  sources={sourcesByItem.get(item.id) ?? []}
                  sourcesByItem={sourcesByItem}
                />
              </section>
            ))
          )}

          <footer className="border-t border-gray-200 pt-6">
            <nav className="flex flex-wrap items-center justify-between gap-3">
              {adjacentRes.previous ? (
                <Link
                  href={`/jasne-zpravy/${adjacentRes.previous.slug}`}
                  className="inline-flex min-h-10 items-center rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:border-[#F37021]/35 hover:text-[#F37021]"
                >
                  ← Předchozí vydání
                </Link>
              ) : (
                <span className="inline-flex min-h-10 items-center rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-400">
                  ← Předchozí vydání
                </span>
              )}
              <Link
                href="/jasne-zpravy"
                className="inline-flex min-h-10 items-center rounded-xl border border-[#F37021]/25 bg-[#F37021]/10 px-3 py-2 text-sm font-semibold text-[#B04A00] hover:bg-[#F37021]/15"
              >
                Zpět na homepage
              </Link>
              {adjacentRes.next ? (
                <Link
                  href={`/jasne-zpravy/${adjacentRes.next.slug}`}
                  className="inline-flex min-h-10 items-center rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:border-[#F37021]/35 hover:text-[#F37021]"
                >
                  Další vydání →
                </Link>
              ) : (
                <span className="inline-flex min-h-10 items-center rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-400">
                  Další vydání →
                </span>
              )}
            </nav>
            {adjacentRes.previousError || adjacentRes.nextError ? (
              <p className="mt-3 text-sm text-amber-700">Navigace mezi vydáními je dočasně omezená.</p>
            ) : null}
          </footer>
        </section>

        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-gray-500">Obsah vydání</h2>
            {sortedItems.length === 0 ? (
              <p className="mt-3 text-sm text-gray-600">Bez položek.</p>
            ) : (
              <ol className="mt-3 space-y-2">
                {sortedItems.map((item, index) => (
                  <li key={item.id}>
                    <a href={`#${getItemSlug(item)}`} className="block rounded-lg border border-gray-200 px-3 py-2 hover:border-[#F37021]/35">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-gray-500">#{item.rank ?? index + 1}</p>
                      <p className="jz-headline mt-1 line-clamp-2 text-sm font-medium text-gray-900">{item.short_headline ?? item.headline}</p>
                    </a>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-gray-500">Nejlépe ozdrojováno</h2>
            {sourceLeaders.length === 0 ? (
              <p className="mt-3 text-sm text-gray-600">Zdrojová data nejsou dostupná.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {sourceLeaders.map((item) => (
                  <li key={item.id}>
                    <a
                      href={`#${getItemSlug(item)}`}
                      className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2 hover:border-[#F37021]/35"
                    >
                      <span className="jz-headline line-clamp-2 text-sm font-medium text-gray-900">{item.short_headline ?? item.headline}</span>
                      <span className="text-xs text-gray-500">{getItemSourceCount(item, sourcesByItem)}</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-gray-200 bg-[#fffaf3] p-4 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-[#B04A00]">Redakční kontext</h2>
            <p className="mt-3 text-sm leading-6 text-gray-700">
              Vydání publikováno: {formatPragueDateAndTimeCompact(getEditionTimestamp(edition))}. Každá zpráva obsahuje
              kontext, zdroje a transparentní metriky.
            </p>
          </section>
        </aside>
      </div>
    </main>
  );
}

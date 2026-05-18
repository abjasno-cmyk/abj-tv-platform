import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { NewsSections } from "../_components/NewsSections";
import {
  createSupabaseNewsClient,
  fetchAdjacentPublishedEditions,
  fetchPublishedEditionBySlug,
  fetchPublishedItemsForEdition,
  fetchSourcesForItemIds,
  formatPragueDateAndTimeCompact,
  formatPragueDateTime,
  formatPragueTime,
  getEditionTimestamp,
  getEditionTypeLabel,
  groupSourcesByItemId,
  type NewsEdition,
} from "@/lib/jasne-zpravy";

export const revalidate = 3600;

function itemRank(item: { rank: number | null; headline: string; short_headline: string | null }): number {
  return item.rank ?? Number.MAX_SAFE_INTEGER;
}

function sourceCountLabel(count: number): string {
  if (count === 1) return "1 zdroj";
  if (count > 1 && count < 5) return `${count} zdroje`;
  return `${count} zdrojů`;
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

  if (!edition) {
    return { title: "Vydání nenalezeno — Jasné zprávy" };
  }

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
      siteName: "Jasné zprávy — ABJ",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
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
  const editionErr = editionRes.error;

  if (editionErr) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-12">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
          Nepodařilo se načíst vydání: {editionErr.message}
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

  const itemList = itemsRes.data ?? [];
  const sourcesRes = await fetchSourcesForItemIds(
    supabase,
    itemList.map((item) => item.id),
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

  const editionTime = getEditionTimestamp(edition);
  const sortedItems = [...itemList].sort((a, b) => itemRank(a) - itemRank(b));
  const sourcesByItem = groupSourcesByItemId(sourcesRes.data ?? []);
  const topItems = sortedItems.slice(0, 3);
  const sourceLeaders = [...sortedItems]
    .sort(
      (a, b) =>
        (sourcesByItem.get(b.id)?.length ?? b.source_count ?? 0) -
          (sourcesByItem.get(a.id)?.length ?? a.source_count ?? 0) || itemRank(a) - itemRank(b),
    )
    .slice(0, 4);

  return (
    <main className="mx-auto w-full max-w-[1240px] px-4 py-8 md:py-12">
      <nav className="mb-4 flex flex-wrap items-center gap-2 text-sm text-gray-500">
        <Link href="/jasne-zpravy" className="font-semibold hover:text-gray-900">
          ← Zpět na vydání
        </Link>
        <span>/</span>
        <Link href="/jasne-zpravy/archiv" className="hover:text-gray-900">
          Archiv
        </Link>
        <span>/</span>
        <span className="font-medium text-gray-700">
          {getEditionTypeLabel(edition.edition_type)} · {formatPragueDateAndTimeCompact(editionTime)}
        </span>
      </nav>

      <header
        id="vydani-top"
        className="mb-8 rounded-3xl border border-[#FF6A00]/20 bg-gradient-to-b from-[#fffaf3] to-white p-6 shadow-[0_12px_30px_rgba(17,17,17,0.06)] md:p-8"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="rounded-full bg-[#FF6A00] px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
            {getEditionTypeLabel(edition.edition_type)} vydání
          </span>
          <time className="text-sm text-gray-500">{formatPragueDateTime(editionTime)}</time>
        </div>
        <h1 className="mt-4 text-3xl font-black leading-tight text-gray-950 md:text-5xl">{edition.title}</h1>
        {edition.subtitle ? <p className="mt-3 text-lg leading-7 text-gray-700">{edition.subtitle}</p> : null}
        {edition.summary ? <p className="mt-4 max-w-3xl text-base leading-7 text-gray-700">{edition.summary}</p> : null}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700">
            {sortedItems.length} publikovaných zpráv
          </span>
          <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700">
            aktualizováno v {formatPragueTime(editionTime)}
          </span>
        </div>
        {topItems.length > 0 ? (
          <ul className="mt-4 grid gap-2 md:grid-cols-3">
            {topItems.map((item, index) => (
              <li key={item.id}>
                <a
                  href={`#zprava-${item.id}`}
                  className="block rounded-xl border border-gray-200 bg-white px-3 py-2 transition hover:border-[#FF6A00]/35 hover:shadow-sm"
                >
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#B04A00]">Top #{index + 1}</p>
                  <p className="mt-1 line-clamp-2 text-sm font-semibold text-gray-900">
                    {item.short_headline ?? item.headline}
                  </p>
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </header>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_330px]">
        <section className="min-w-0">
          <NewsSections
            items={sortedItems}
            sourcesByItem={sourcesByItem}
            headingLevel="h2"
            mode="detail"
            editionSlug={edition.slug}
            editionDateTimeLabel={formatPragueDateTime(editionTime)}
          />

          <footer className="mt-10 border-t border-gray-200 pt-6">
            <nav className="flex flex-wrap items-center justify-between gap-3">
              {adjacentRes.previous ? (
                <Link
                  href={`/jasne-zpravy/${adjacentRes.previous.slug}`}
                  className="inline-flex items-center rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:border-[#FF6A00]/35 hover:text-[#FF6A00]"
                >
                  ← Předchozí vydání
                </Link>
              ) : (
                <span className="inline-flex items-center rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-400">
                  ← Předchozí vydání
                </span>
              )}

              <Link
                href="/jasne-zpravy"
                className="inline-flex items-center rounded-xl border border-[#FF6A00]/25 bg-[#FF6A00]/10 px-3 py-2 text-sm font-semibold text-[#B04A00] hover:bg-[#FF6A00]/15"
              >
                Zpět na celé vydání
              </Link>

              {adjacentRes.next ? (
                <Link
                  href={`/jasne-zpravy/${adjacentRes.next.slug}`}
                  className="inline-flex items-center rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:border-[#FF6A00]/35 hover:text-[#FF6A00]"
                >
                  Další vydání →
                </Link>
              ) : (
                <span className="inline-flex items-center rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-400">
                  Další vydání →
                </span>
              )}
            </nav>
            {(adjacentRes.previousError || adjacentRes.nextError) ? (
              <p className="mt-3 text-sm text-amber-700">
                Navigace mezi vydáními je dočasně omezená. Zkuste načíst stránku znovu.
              </p>
            ) : null}
          </footer>
        </section>

        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-gray-500">Obsah vydání</h2>
            {sortedItems.length === 0 ? (
              <p className="mt-3 text-sm text-gray-600">Vydání zatím neobsahuje publikované zprávy.</p>
            ) : (
              <ol className="mt-3 space-y-2">
                {sortedItems.map((item, index) => (
                  <li key={item.id}>
                    <a
                      href={`#zprava-${item.id}`}
                      className="block rounded-lg border border-gray-200 px-3 py-2 hover:border-[#FF6A00]/35"
                    >
                      <p className="text-[11px] uppercase tracking-[0.12em] text-gray-500">#{item.rank ?? index + 1}</p>
                      <p className="mt-1 line-clamp-2 text-sm font-medium text-gray-900">
                        {item.short_headline ?? item.headline}
                      </p>
                    </a>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-gray-500">Nejlépe ozdrojováno</h2>
            {sourceLeaders.length === 0 ? (
              <p className="mt-3 text-sm text-gray-600">Zdrojové údaje nejsou dostupné.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {sourceLeaders.map((item) => (
                  <li key={item.id}>
                    <a
                      href={`#zprava-${item.id}`}
                      className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2 hover:border-[#FF6A00]/35"
                    >
                      <span className="line-clamp-2 text-sm font-medium text-gray-900">
                        {item.short_headline ?? item.headline}
                      </span>
                      <span className="text-xs text-gray-500">
                        {sourceCountLabel(sourcesByItem.get(item.id)?.length ?? item.source_count ?? 0)}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
}

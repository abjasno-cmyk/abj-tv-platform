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

  const [itemsRes, adjacentRes] = await Promise.all([
    fetchPublishedItemsForEdition(supabase, edition.id),
    fetchAdjacentPublishedEditions(supabase, edition),
  ]);
  if (itemsRes.error) {
    return (
      <main className="mx-auto max-w-6xl bg-[#FBF8F2] px-4 py-12">
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
      <main className="mx-auto max-w-6xl bg-[#FBF8F2] px-4 py-12">
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
    <main className="mx-auto w-full max-w-[1240px] bg-[#FBF8F2] px-4 py-8 text-verox-ink md:py-12">
      <nav className="mb-5 flex flex-wrap items-center gap-3">
        <Link href="/jasne-zpravy" className="vx-action">
          ← Jasné zprávy
        </Link>
        <span className="vx-meta">/</span>
        <Link href="/jasne-zpravy/archiv" className="vx-meta hover:text-verox-ink">
          Archiv
        </Link>
      </nav>

      <header className="mb-10 border-y-2 border-verox-ink bg-verox-card px-6 py-8 md:px-8 md:py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="vx-badge">{getEditionTypeLabel(edition.edition_type)} vydání</span>
          <time className="vx-meta">{formatPragueDateTime(getEditionTimestamp(edition))}</time>
        </div>
        <h1 className="vx-display mt-4 text-verox-ink" style={{ fontSize: "clamp(2.2rem, 5vw, 3.8rem)", lineHeight: 0.98 }}>
          {edition.title}
        </h1>
        {edition.subtitle ? <p className="mt-3 text-lg leading-relaxed text-verox-charcoal">{edition.subtitle}</p> : null}
        {edition.summary ? <p className="mt-3 max-w-3xl leading-relaxed text-verox-charcoal">{edition.summary}</p> : null}
        <p className="vx-meta mt-4">{sortedItems.length} publikovaných zpráv</p>
      </header>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="min-w-0 space-y-6">
          {sortedItems.length === 0 ? (
            <p className="border-2 border-verox-line bg-verox-card p-6 text-sm text-verox-charcoal">
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

          <footer className="border-t-2 border-verox-line pt-6">
            <nav className="flex flex-wrap items-center justify-between gap-3">
              {adjacentRes.previous ? (
                <Link href={`/jasne-zpravy/${adjacentRes.previous.slug}`} className="vx-btn vx-btn--ghost-ink vx-btn--sm">
                  ← Předchozí vydání
                </Link>
              ) : (
                <span className="vx-btn vx-btn--ghost-ink vx-btn--sm opacity-40">← Předchozí vydání</span>
              )}
              <Link href="/jasne-zpravy" className="vx-btn vx-btn--solid vx-btn--sm">
                Zpět na homepage
              </Link>
              {adjacentRes.next ? (
                <Link href={`/jasne-zpravy/${adjacentRes.next.slug}`} className="vx-btn vx-btn--ghost-ink vx-btn--sm">
                  Další vydání →
                </Link>
              ) : (
                <span className="vx-btn vx-btn--ghost-ink vx-btn--sm opacity-40">Další vydání →</span>
              )}
            </nav>
            {adjacentRes.previousError || adjacentRes.nextError ? (
              <p className="vx-meta mt-3 text-verox-orangeText">Navigace mezi vydáními je dočasně omezená.</p>
            ) : null}
          </footer>
        </section>

        <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
          <section className="border-2 border-verox-line bg-verox-card p-4">
            <h2 className="vx-kicker text-verox-ink">Obsah vydání</h2>
            {sortedItems.length === 0 ? (
              <p className="mt-3 text-sm text-verox-charcoal">Bez položek.</p>
            ) : (
              <ol className="mt-3 space-y-2">
                {sortedItems.map((item, index) => (
                  <li key={item.id}>
                    <a href={`#${getItemSlug(item)}`} className="block border-2 border-verox-line px-3 py-2 hover:border-verox-orange">
                      <p className="vx-meta">#{item.rank ?? index + 1}</p>
                      <p className="vx-display mt-1 line-clamp-2 text-verox-ink" style={{ fontSize: "0.95rem", lineHeight: 1.2 }}>
                        {item.short_headline ?? item.headline}
                      </p>
                    </a>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="border-2 border-verox-line bg-verox-card p-4">
            <h2 className="vx-kicker text-verox-ink">Nejlépe ozdrojováno</h2>
            {sourceLeaders.length === 0 ? (
              <p className="mt-3 text-sm text-verox-charcoal">Zdrojová data nejsou dostupná.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {sourceLeaders.map((item) => (
                  <li key={item.id}>
                    <a
                      href={`#${getItemSlug(item)}`}
                      className="flex items-center justify-between gap-2 border-2 border-verox-line px-3 py-2 hover:border-verox-orange"
                    >
                      <span className="line-clamp-2 text-sm font-medium text-verox-ink">{item.short_headline ?? item.headline}</span>
                      <span className="vx-meta shrink-0">{getItemSourceCount(item, sourcesByItem)}</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="border-2 border-verox-ink bg-verox-paper p-4">
            <h2 className="vx-kicker text-verox-orangeDeep">Redakční kontext</h2>
            <p className="mt-3 text-sm leading-relaxed text-verox-charcoal">
              Vydání publikováno: {formatPragueDateAndTimeCompact(getEditionTimestamp(edition))}. Každá zpráva obsahuje
              kontext, zdroje a transparentní metriky.
            </p>
          </section>
        </aside>
      </div>
    </main>
  );
}

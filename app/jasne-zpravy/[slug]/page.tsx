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
  const sourcesByItem = groupSourcesByItemId(sourcesRes.data ?? []);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 md:py-12">
      <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm text-gray-500">
        <Link href="/jasne-zpravy" className="hover:text-gray-900">
          Jasné zprávy
        </Link>
        <span>/</span>
        <Link href="/jasne-zpravy/archiv" className="hover:text-gray-900">
          Archiv
        </Link>
        <span>/</span>
        <span className="font-medium text-gray-700">
          {getEditionTypeLabel(edition.edition_type)} vydání · {formatPragueDateAndTimeCompact(editionTime)}
        </span>
      </nav>

      <header className="mb-10 rounded-3xl border border-[#FF6A00]/20 bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="rounded-full bg-[#FF6A00] px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
            {getEditionTypeLabel(edition.edition_type)} vydání
          </span>
          <time className="text-sm text-gray-500">{formatPragueDateTime(editionTime)}</time>
        </div>
        <h1 className="mt-4 text-3xl font-black leading-tight text-gray-950 md:text-4xl">{edition.title}</h1>
        {edition.subtitle && <p className="mt-3 text-lg leading-7 text-gray-700">{edition.subtitle}</p>}
        {edition.summary && <p className="mt-4 max-w-3xl leading-7 text-gray-700">{edition.summary}</p>}
        <p className="mt-5 text-sm font-semibold text-gray-600">
          {itemList.length} publikovaných zpráv · aktualizováno v {formatPragueTime(editionTime)}
        </p>
      </header>

      <NewsSections items={itemList} sourcesByItem={sourcesByItem} headingLevel="h2" />

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
        {(adjacentRes.previousError || adjacentRes.nextError) && (
          <p className="mt-3 text-sm text-amber-700">
            Navigace mezi vydáními je dočasně omezená. Zkuste načíst stránku znovu.
          </p>
        )}
      </footer>
    </main>
  );
}

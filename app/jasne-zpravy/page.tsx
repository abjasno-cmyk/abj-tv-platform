import Link from "next/link";
import { NewsSections } from "./_components/NewsSections";
import {
  createSupabaseNewsClient,
  dayKeyToOrdinal,
  fetchLatestPublishedEdition,
  fetchPublishedItemCountsByEditionIds,
  fetchPublishedItemsForEdition,
  fetchRecentPublishedEditions,
  fetchSourcesForItemIds,
  formatPragueDate,
  formatPragueDateWithWeekday,
  formatPragueDateTime,
  formatPragueTime,
  getEditionTimestamp,
  getEditionTypeLabel,
  groupSourcesByItemId,
  toPragueDayKey,
  type NewsEdition,
  type NewsItem,
  type NewsSource,
} from "@/lib/jasne-zpravy";

export const revalidate = 60;

const RECENT_EDITIONS_LIMIT = 220;

function itemRank(item: NewsItem): number {
  return item.rank ?? Number.MAX_SAFE_INTEGER;
}

function byEditionTimeDesc(a: NewsEdition, b: NewsEdition): number {
  const aTs = new Date(getEditionTimestamp(a) ?? 0).getTime();
  const bTs = new Date(getEditionTimestamp(b) ?? 0).getTime();
  return bTs - aTs;
}

export default async function JasneZpravyPage() {
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

  const latestRes = await fetchLatestPublishedEdition(supabase);
  if (latestRes.error) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-12">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
          Nepodařilo se načíst poslední vydání: {latestRes.error.message}
        </div>
      </main>
    );
  }

  const latestEdition = latestRes.data as NewsEdition | null;
  if (!latestEdition) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-12">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-gray-700">
          Zatím není publikované žádné vydání Jasných zpráv.
        </div>
      </main>
    );
  }

  const [latestItemsRes, recentEditionsRes] = await Promise.all([
    fetchPublishedItemsForEdition(supabase, latestEdition.id),
    fetchRecentPublishedEditions(supabase, RECENT_EDITIONS_LIMIT),
  ]);

  if (latestItemsRes.error) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-12">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
          Nepodařilo se načíst obsah vydání: {latestItemsRes.error.message}
        </div>
      </main>
    );
  }

  const latestItems = [...((latestItemsRes.data ?? []) as NewsItem[])].sort(
    (a, b) => itemRank(a) - itemRank(b),
  );
  const latestItemIds = latestItems.map((item) => item.id);
  const latestSourcesRes = await fetchSourcesForItemIds(supabase, latestItemIds);

  if (latestSourcesRes.error) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-12">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
          Nepodařilo se načíst zdroje zpráv: {latestSourcesRes.error.message}
        </div>
      </main>
    );
  }

  const recentEditions = ((recentEditionsRes.data ?? []) as NewsEdition[]).filter(
    (edition) => edition.id !== latestEdition.id,
  );
  const editionsForCounts = [latestEdition, ...recentEditions];
  const countRes = await fetchPublishedItemCountsByEditionIds(
    supabase,
    editionsForCounts.map((edition) => edition.id),
  );

  const countError = countRes.error;
  const itemCounts = countRes.counts;
  const latestEditionTime = getEditionTimestamp(latestEdition);
  const latestItemCount = itemCounts.get(latestEdition.id) ?? latestItems.length;

  const todayDayKey = toPragueDayKey(new Date());
  const todayEditions = recentEditions
    .filter((edition) => toPragueDayKey(getEditionTimestamp(edition)) === todayDayKey)
    .sort(byEditionTimeDesc);

  const todayOrdinal = dayKeyToOrdinal(todayDayKey);
  const olderByDay = new Map<string, NewsEdition[]>();

  for (const edition of recentEditions) {
    const dayKey = toPragueDayKey(getEditionTimestamp(edition));
    const dayOrdinal = dayKeyToOrdinal(dayKey);
    if (todayOrdinal === null || dayOrdinal === null) continue;

    const daysAgo = todayOrdinal - dayOrdinal;
    if (daysAgo < 1 || daysAgo > 14) continue;

    const grouped = olderByDay.get(dayKey) ?? [];
    grouped.push(edition);
    olderByDay.set(dayKey, grouped);
  }

  const olderDayKeys = Array.from(olderByDay.keys()).sort((a, b) => {
    const aOrd = dayKeyToOrdinal(a) ?? 0;
    const bOrd = dayKeyToOrdinal(b) ?? 0;
    return bOrd - aOrd;
  });

  const topHeadlines = latestItems
    .slice(0, 3)
    .map((item) => item.short_headline ?? item.headline)
    .filter(Boolean);
  const sourcesByItem = groupSourcesByItemId((latestSourcesRes.data ?? []) as NewsSource[]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 md:py-12">
      {countError && (
        <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Nepodařilo se spočítat všechny počty zpráv. Obsah je zobrazen, ale některé počty mohou být nepřesné.
        </div>
      )}

      <section className="mb-10 rounded-3xl border border-[#FF6A00]/20 bg-gradient-to-b from-white to-orange-50/40 p-6 shadow-sm md:p-8">
        <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-[#B04A00]">ABJ NEWSROOM</p>
        <h1 className="mt-2 text-3xl font-black leading-tight text-gray-950 md:text-4xl">Jasné zprávy</h1>
        <p className="mt-2 max-w-2xl text-gray-700">Dnešní přehled bez zbytečné mlhy.</p>
        <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <span className="font-semibold text-gray-800">
            {getEditionTypeLabel(latestEdition.edition_type)} vydání
          </span>
          <span className="text-gray-500">{formatPragueDateTime(latestEditionTime)}</span>
          <span className="rounded-full border border-[#FF6A00]/25 bg-[#FF6A00]/10 px-2.5 py-1 text-xs font-semibold text-[#B04A00]">
            {latestItemCount} zpráv
          </span>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 text-lg font-extrabold uppercase tracking-[0.16em] text-gray-800">
          Nejnovější vydání
        </h2>
        <article className="rounded-3xl border border-[#FF6A00]/25 bg-white p-6 shadow-md md:p-7">
          <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-wider">
            <span className="rounded-full bg-[#FF6A00] px-2.5 py-1 font-bold text-white">
              {getEditionTypeLabel(latestEdition.edition_type)} vydání
            </span>
            <time className="font-semibold text-gray-500">{formatPragueDateTime(latestEditionTime)}</time>
          </div>
          <h3 className="mt-4 text-2xl font-black leading-tight text-gray-950">{latestEdition.title}</h3>
          {latestEdition.summary && (
            <p className="mt-3 max-w-3xl text-base leading-7 text-gray-700">{latestEdition.summary}</p>
          )}
          {topHeadlines.length > 0 && (
            <ul className="mt-5 grid gap-2 sm:grid-cols-3">
              {topHeadlines.map((headline) => (
                <li
                  key={headline}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-800"
                >
                  {headline}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-gray-600">{latestItemCount} publikovaných zpráv</span>
            <Link
              href={`/jasne-zpravy/${latestEdition.slug}`}
              className="inline-flex items-center text-sm font-bold text-[#FF6A00] hover:text-[#cc5500]"
            >
              Otevřít celé vydání →
            </Link>
          </div>
        </article>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 text-lg font-extrabold uppercase tracking-[0.16em] text-gray-800">Dnes</h2>
        {todayEditions.length === 0 ? (
          <p className="rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
            Dnes zatím nebylo publikováno další vydání.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {todayEditions.map((edition) => (
              <article
                key={edition.id}
                className="rounded-2xl border border-gray-200 bg-white p-4 transition hover:border-[#FF6A00]/35 hover:shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <time className="font-mono text-sm text-gray-500">
                    {formatPragueTime(getEditionTimestamp(edition))}
                  </time>
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-600">
                    {getEditionTypeLabel(edition.edition_type)}
                  </span>
                </div>
                <h3 className="mt-2 text-lg font-bold leading-snug text-gray-900">{edition.title}</h3>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                    {itemCounts.get(edition.id) ?? 0} zpráv
                  </span>
                  <Link
                    href={`/jasne-zpravy/${edition.slug}`}
                    className="text-sm font-semibold text-[#FF6A00] hover:text-[#cc5500]"
                  >
                    Otevřít →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mb-12">
        <header className="mb-6 border-b border-gray-200 pb-4">
          <h2 className="text-2xl font-black tracking-tight text-gray-950">Aktuální obsah nejnovějšího vydání</h2>
          <p className="mt-2 text-sm text-gray-600">
            {getEditionTypeLabel(latestEdition.edition_type)} vydání · {formatPragueDate(latestEditionTime)}
          </p>
        </header>
        <NewsSections items={latestItems} sourcesByItem={sourcesByItem} headingLevel="h3" />
      </section>

      <section className="mb-4">
        <h2 className="mb-4 text-lg font-extrabold uppercase tracking-[0.16em] text-gray-800">Starší vydání</h2>
        {olderDayKeys.length === 0 ? (
          <p className="rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
            V posledních 14 dnech zatím nejsou dostupná starší vydání.
          </p>
        ) : (
          <div className="space-y-5">
            {olderDayKeys.map((dayKey) => {
              const editions = [...(olderByDay.get(dayKey) ?? [])].sort(byEditionTimeDesc);
              const dayMoment = getEditionTimestamp(editions[0]);
              return (
                <div key={dayKey} className="rounded-2xl border border-gray-200 bg-white p-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-gray-600">
                    {formatPragueDateWithWeekday(dayMoment)}
                  </h3>
                  <ul className="mt-3 space-y-2">
                    {editions.map((edition) => (
                      <li key={edition.id}>
                        <Link
                          href={`/jasne-zpravy/${edition.slug}`}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm text-gray-700 transition hover:bg-orange-50 hover:text-gray-900"
                        >
                          <span>
                            {formatPragueTime(getEditionTimestamp(edition))} ·{" "}
                            {getEditionTypeLabel(edition.edition_type)} vydání
                          </span>
                          <span className="font-semibold text-gray-500">
                            {itemCounts.get(edition.id) ?? 0} zpráv
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
        <div className="mt-5">
          <Link href="/jasne-zpravy/archiv" className="text-sm font-bold text-[#FF6A00] hover:text-[#cc5500]">
            Zobrazit celý archiv →
          </Link>
        </div>
      </section>
    </main>
  );
}

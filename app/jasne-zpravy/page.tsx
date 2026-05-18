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
  getCategoryLabel,
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

function countWords(value: string | null | undefined): number {
  if (!value) return 0;
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return 0;
  return normalized.split(" ").length;
}

function sourceCount(item: NewsItem, sourcesByItem: Map<string, NewsSource[]>): number {
  const mapped = sourcesByItem.get(item.id)?.length ?? 0;
  return mapped || item.source_count || 0;
}

function sourceCountLabel(count: number): string {
  if (count === 1) return "1 zdroj";
  if (count > 1 && count < 5) return `${count} zdroje`;
  return `${count} zdrojů`;
}

function getPreviewText(item: NewsItem): string {
  const lead = item.lead?.trim();
  if (lead) return lead;
  const body = item.body?.trim() ?? "";
  if (!body) return item.short_headline ?? item.headline;
  const sentence = body.split(/(?<=[.!?])\s+/)[0]?.trim() ?? body;
  if (sentence.length <= 200) return sentence;
  return `${sentence.slice(0, 199).trimEnd()}…`;
}

function estimateReadMinutes(items: NewsItem[]): { quickMinutes: number; fullMinutes: number } {
  const fullWords = items.reduce((acc, item) => {
    return (
      acc +
      countWords(item.headline) +
      countWords(item.short_headline) +
      countWords(item.lead) +
      countWords(item.body) +
      countWords(item.why_it_matters) +
      countWords(item.what_to_watch)
    );
  }, 0);
  const topItems = items.slice(0, 3);
  const quickWords = topItems.reduce((acc, item) => {
    return acc + countWords(item.headline) + countWords(item.lead) + countWords(item.why_it_matters);
  }, 0);
  const fullMinutes = Math.max(5, Math.ceil(fullWords / 220));
  const quickMinutes = Math.max(3, Math.min(fullMinutes, Math.ceil(Math.max(quickWords, fullWords * 0.28) / 220)));
  return { quickMinutes, fullMinutes };
}

function uniqueNonEmpty(values: Array<string | null | undefined>, limit: number): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const trimmed = value?.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
    if (result.length >= limit) break;
  }
  return result;
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
    .filter(Boolean)
    .map((headline) => (headline.length > 60 ? `${headline.slice(0, 59).trimEnd()}…` : headline));
  const sourcesByItem = groupSourcesByItemId((latestSourcesRes.data ?? []) as NewsSource[]);
  const topStories = latestItems.slice(0, 3);
  const categoryStats = {
    domestic: latestItems.filter((item) => item.category === "domestic").length,
    foreign: latestItems.filter((item) => item.category === "foreign").length,
    curiosity: latestItems.filter((item) => item.category === "curiosity").length,
  };
  const readEstimate = estimateReadMinutes(latestItems);
  const watchToday = uniqueNonEmpty(
    latestItems.map((item) => item.what_to_watch ?? item.why_it_matters),
    5,
  );
  const bestSourced = [...latestItems]
    .sort((a, b) => sourceCount(b, sourcesByItem) - sourceCount(a, sourcesByItem) || itemRank(a) - itemRank(b))
    .slice(0, 4);
  const latestByType = new Map<string, NewsEdition>();
  for (const edition of recentEditions) {
    if (!latestByType.has(edition.edition_type)) {
      latestByType.set(edition.edition_type, edition);
    }
  }
  const archiveHighlights = [...latestByType.values()].slice(0, 4);
  const curiosityOfDay = latestItems.find((item) => item.category === "curiosity") ?? null;

  return (
    <main className="mx-auto w-full max-w-[1240px] px-4 py-8 md:py-12">
      {countError && (
        <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Nepodařilo se spočítat všechny počty zpráv. Obsah je zobrazen, ale některé počty mohou být nepřesné.
        </div>
      )}

      <section className="mb-8 rounded-3xl border border-[#FF6A00]/20 bg-gradient-to-b from-[#fffaf3] to-white p-6 shadow-[0_12px_28px_rgba(17,17,17,0.06)] md:p-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-[#B04A00]">ABJ NEWSROOM</p>
            <h1 className="mt-2 text-3xl font-black leading-tight text-gray-950 md:text-5xl">Jasné zprávy</h1>
            <p className="mt-2 max-w-2xl text-base text-gray-700">Denní přehled bez zbytečné mlhy.</p>
            <div className="mt-5 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-gray-700">
              <span className="rounded-full bg-[#FF6A00] px-2.5 py-1 text-white">
                {getEditionTypeLabel(latestEdition.edition_type)} vydání
              </span>
              <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1">
                {formatPragueDateTime(latestEditionTime)}
              </span>
              <span className="rounded-full border border-[#FF6A00]/25 bg-[#FF6A00]/10 px-2.5 py-1 text-[#B04A00]">
                {latestItemCount} zpráv
              </span>
            </div>
            {topHeadlines.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {topHeadlines.map((headline) => (
                  <span
                    key={headline}
                    className="rounded-full border border-gray-200 bg-white/90 px-3 py-1 text-xs font-medium text-gray-700"
                  >
                    {headline}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          <aside className="rounded-2xl border border-gray-200 bg-white/95 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-500">Aktuální vydání</p>
            <h2 className="mt-2 text-lg font-black leading-tight text-gray-900">{latestEdition.title}</h2>
            <p className="mt-2 text-sm text-gray-600">
              {latestItemCount} zpráv · aktualizováno {formatPragueTime(latestEditionTime)}
            </p>
            <Link
              href={`/jasne-zpravy/${latestEdition.slug}`}
              className="mt-4 inline-flex rounded-lg border border-[#FF6A00]/25 bg-[#FF6A00]/10 px-3 py-2 text-sm font-bold text-[#B04A00] hover:bg-[#FF6A00]/15"
            >
              Otevřít celé vydání →
            </Link>
          </aside>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-lg font-extrabold uppercase tracking-[0.16em] text-gray-800">
          Nejnovější vydání
        </h2>
        <article className="rounded-3xl border border-[#FF6A00]/25 bg-white p-5 shadow-[0_12px_28px_rgba(17,17,17,0.08)] md:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-wider">
            <span className="rounded-full bg-[#FF6A00] px-3 py-1 font-bold text-white">
              {getEditionTypeLabel(latestEdition.edition_type)} vydání
            </span>
            <time className="font-semibold text-gray-500">{formatPragueDateTime(latestEditionTime)}</time>
          </div>
          <h3 className="mt-4 text-2xl font-black leading-tight text-gray-950">{latestEdition.title}</h3>
          <p className="mt-2 text-sm text-gray-600">Hlavní témata dne</p>
          {latestEdition.summary && (
            <p className="mt-3 max-w-3xl text-base leading-7 text-gray-700">{latestEdition.summary}</p>
          )}
          {topStories.length > 0 && (
            <ul className="mt-5 grid gap-2 md:grid-cols-3">
              {topStories.map((item, index) => (
                <li key={item.id}>
                  <Link
                    href={`/jasne-zpravy/${latestEdition.slug}#zprava-${item.id}`}
                    className="block rounded-xl border border-gray-200 bg-[#fffaf6] px-3 py-2 transition hover:border-[#FF6A00]/35 hover:shadow-sm"
                  >
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#B04A00]">Top #{index + 1}</p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">{item.short_headline ?? item.headline}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-sm text-gray-700">
              {latestItemCount} publikovaných zpráv
            </span>
            <Link
              href={`/jasne-zpravy/${latestEdition.slug}`}
              className="inline-flex items-center rounded-lg border border-[#FF6A00]/20 bg-[#FF6A00]/10 px-3 py-2 text-sm font-bold text-[#B04A00] hover:bg-[#FF6A00]/15"
            >
              Otevřít celé vydání →
            </Link>
          </div>
        </article>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-lg font-extrabold uppercase tracking-[0.16em] text-gray-800">Dnes</h2>
        {todayEditions.length === 0 ? (
          <p className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
            Dnes zatím nebylo publikováno další vydání.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {todayEditions.map((edition) => (
              <article
                key={edition.id}
                className="rounded-xl border border-gray-200 bg-white p-4 transition hover:border-[#FF6A00]/35 hover:shadow-sm"
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

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_330px]">
        <section className="min-w-0">
          <div className="mb-6 rounded-2xl border border-gray-200 bg-[#fffdf9] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-500">Rychlá orientace</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div className="rounded-xl border border-gray-200 bg-white px-3 py-2">
                <p className="text-[11px] uppercase tracking-[0.12em] text-gray-500">Domácí</p>
                <p className="mt-1 text-xl font-black text-gray-900">{categoryStats.domestic}</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white px-3 py-2">
                <p className="text-[11px] uppercase tracking-[0.12em] text-gray-500">Zahraničí</p>
                <p className="mt-1 text-xl font-black text-gray-900">{categoryStats.foreign}</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white px-3 py-2">
                <p className="text-[11px] uppercase tracking-[0.12em] text-gray-500">Zajímavosti</p>
                <p className="mt-1 text-xl font-black text-gray-900">{categoryStats.curiosity}</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 sm:col-span-2">
                <p className="text-[11px] uppercase tracking-[0.12em] text-gray-500">Odhad čtení</p>
                <p className="mt-1 text-sm font-semibold text-gray-900">
                  {readEstimate.quickMinutes} min rychlý přehled / {readEstimate.fullMinutes} min celé vydání
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 sm:col-span-2 lg:col-span-5">
                <p className="text-[11px] uppercase tracking-[0.12em] text-gray-500">Poslední aktualizace</p>
                <p className="mt-1 text-sm font-medium text-gray-900">{formatPragueDateTime(latestEditionTime)}</p>
              </div>
            </div>
          </div>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-black tracking-tight text-gray-950">Top zprávy dne</h2>
            {topStories.length === 0 ? (
              <p className="rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
                Hlavní zprávy zatím nejsou dostupné.
              </p>
            ) : (
              <div className="grid gap-4 lg:grid-cols-3">
                <article className="rounded-3xl border border-[#FF6A00]/25 bg-white p-5 shadow-sm lg:col-span-2">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#B04A00]">
                    {getCategoryLabel(topStories[0].category)}
                  </p>
                  <h3 className="mt-2 text-2xl font-black leading-tight text-gray-950">
                    {topStories[0].short_headline ?? topStories[0].headline}
                  </h3>
                  <p className="mt-3 text-base leading-7 text-gray-700">{getPreviewText(topStories[0])}</p>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-600">
                      {sourceCountLabel(sourceCount(topStories[0], sourcesByItem))}
                    </span>
                    <Link
                      href={`/jasne-zpravy/${latestEdition.slug}#zprava-${topStories[0].id}`}
                      className="text-sm font-bold uppercase tracking-[0.08em] text-[#FF6A00] hover:text-[#cc5500]"
                    >
                      Číst zprávu →
                    </Link>
                  </div>
                </article>

                <div className="space-y-4">
                  {topStories.slice(1).map((story) => (
                    <article key={story.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-500">
                        {getCategoryLabel(story.category)}
                      </p>
                      <h3 className="mt-2 text-lg font-black leading-snug text-gray-900">
                        {story.short_headline ?? story.headline}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-gray-700">{getPreviewText(story)}</p>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span className="text-xs text-gray-500">{sourceCountLabel(sourceCount(story, sourcesByItem))}</span>
                        <Link
                          href={`/jasne-zpravy/${latestEdition.slug}#zprava-${story.id}`}
                          className="text-xs font-bold uppercase tracking-[0.08em] text-[#FF6A00] hover:text-[#cc5500]"
                        >
                          Číst zprávu
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
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
            <NewsSections
              items={latestItems}
              sourcesByItem={sourcesByItem}
              headingLevel="h3"
              mode="overview"
              editionSlug={latestEdition.slug}
            />
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
                              <span className="font-semibold text-gray-500">{itemCounts.get(edition.id) ?? 0} zpráv</span>
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
        </section>

        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-gray-500">Co dnes sledovat</h2>
            {watchToday.length === 0 ? (
              <p className="mt-3 text-sm text-gray-600">Dnes zatím nemáme vyplněné sledované body.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {watchToday.map((point) => (
                  <li key={point} className="flex gap-2 text-sm leading-6 text-gray-800">
                    <span className="mt-[7px] h-1.5 w-1.5 rounded-full bg-[#FF6A00]" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-gray-500">Nejlépe ozdrojováno</h2>
            {bestSourced.length === 0 ? (
              <p className="mt-3 text-sm text-gray-600">Zdrojové údaje zatím nejsou dostupné.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {bestSourced.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/jasne-zpravy/${latestEdition.slug}#zprava-${item.id}`}
                      className="block rounded-lg border border-gray-200 px-3 py-2 hover:border-[#FF6A00]/35"
                    >
                      <p className="line-clamp-2 text-sm font-semibold leading-5 text-gray-900">
                        {item.short_headline ?? item.headline}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">{sourceCountLabel(sourceCount(item, sourcesByItem))}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-gray-500">Archiv vydání</h2>
            {archiveHighlights.length === 0 ? (
              <p className="mt-3 text-sm text-gray-600">Archiv zatím neobsahuje další vydání.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {archiveHighlights.map((edition) => (
                  <li key={edition.id}>
                    <Link
                      href={`/jasne-zpravy/${edition.slug}`}
                      className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2 hover:border-[#FF6A00]/35"
                    >
                      <span className="text-sm font-medium text-gray-900">{getEditionTypeLabel(edition.edition_type)}</span>
                      <span className="text-xs text-gray-500">{formatPragueTime(getEditionTimestamp(edition))}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-gray-200 bg-[#fffaf3] p-4 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-[#B04A00]">Zajímavost dne</h2>
            {curiosityOfDay ? (
              <div className="mt-3">
                <p className="text-sm font-semibold leading-6 text-gray-900">
                  {curiosityOfDay.short_headline ?? curiosityOfDay.headline}
                </p>
                <p className="mt-2 text-sm leading-6 text-gray-700">{getPreviewText(curiosityOfDay)}</p>
                <Link
                  href={`/jasne-zpravy/${latestEdition.slug}#zprava-${curiosityOfDay.id}`}
                  className="mt-3 inline-flex text-xs font-bold uppercase tracking-[0.08em] text-[#FF6A00]"
                >
                  Číst zprávu →
                </Link>
              </div>
            ) : (
              <p className="mt-3 text-sm text-gray-700">Dnes zatím nebyla publikována samostatná zajímavost.</p>
            )}
          </section>
        </aside>
      </div>
      <div className="mt-1">
        <Link href="/jasne-zpravy/archiv" className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-500 hover:text-gray-900">
          Přehled všech vydání v archivu
        </Link>
      </div>
    </main>
  );
}

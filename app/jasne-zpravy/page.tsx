import {
  createSupabaseNewsClient,
  dayKeyToOrdinal,
  fetchLatestPublishedEdition,
  fetchPublishedItemCountsByEditionIds,
  fetchPublishedItemsForEdition,
  fetchRecentPublishedEditions,
  fetchSourcesForItemIds,
  getEditionTimestamp,
  getItemSourceCount,
  groupSourcesByItemId,
  isFollowup,
  toPragueDayKey,
  type NewsEdition,
  type NewsItem,
} from "@/lib/jasne-zpravy";
import { CurrentEditionView } from "./_components/CurrentEditionView";
import { EditionTabs } from "./_components/EditionTabs";
import { EditionsArchive } from "./_components/EditionsArchive";
import { NewsroomHeader } from "./_components/NewsroomHeader";
import { NewsroomSidebar } from "./_components/NewsroomSidebar";
import { TodayTopStories } from "./_components/TodayTopStories";

export const revalidate = 60;

const RECENT_EDITIONS_LIMIT = 220;

function byEditionTimeDesc(a: NewsEdition, b: NewsEdition): number {
  const aTs = new Date(getEditionTimestamp(a) ?? 0).getTime();
  const bTs = new Date(getEditionTimestamp(b) ?? 0).getTime();
  return bTs - aTs;
}

function uniqueNonEmpty(values: Array<string | null | undefined>, limit: number): string[] {
  const output: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const normalized = value?.trim();
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(normalized);
    if (output.length >= limit) break;
  }
  return output;
}

function timeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const map = new Map(parts.map((part) => [part.type, part.value]));
  const year = Number(map.get("year"));
  const month = Number(map.get("month"));
  const day = Number(map.get("day"));
  const hour = Number(map.get("hour"));
  const minute = Number(map.get("minute"));
  const second = Number(map.get("second"));
  const asUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  return asUtc - date.getTime();
}

function zonedDateTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string,
): Date {
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  const offset = timeZoneOffsetMs(utcGuess, timeZone);
  return new Date(utcGuess.getTime() - offset);
}

function getPragueNowParts(date: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Prague",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const map = new Map(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(map.get("year")),
    month: Number(map.get("month")),
    day: Number(map.get("day")),
  };
}

function formatDurationLabel(diffMs: number): string {
  const minutes = Math.max(1, Math.round(diffMs / 60_000));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours <= 0) return `${minutes} min`;
  if (rest === 0) return `${hours} h`;
  return `${hours} h ${rest} min`;
}

function getTimeToNextEditionLabel(): string | null {
  const now = new Date();
  const prague = getPragueNowParts(now);
  const schedule = [
    { dayOffset: 0, hour: 7 },
    { dayOffset: 0, hour: 12 },
    { dayOffset: 0, hour: 18 },
    { dayOffset: 1, hour: 7 },
  ];

  for (const slot of schedule) {
    const nextDay = new Date(Date.UTC(prague.year, prague.month - 1, prague.day + slot.dayOffset));
    const target = zonedDateTimeToUtc(
      nextDay.getUTCFullYear(),
      nextDay.getUTCMonth() + 1,
      nextDay.getUTCDate(),
      slot.hour,
      0,
      0,
      "Europe/Prague",
    );
    if (target.getTime() > now.getTime()) {
      return formatDurationLabel(target.getTime() - now.getTime());
    }
  }
  return null;
}

export default async function JasneZpravyPage() {
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

  const latestRes = await fetchLatestPublishedEdition(supabase);
  if (latestRes.error) {
    return (
      <main className="mx-auto max-w-6xl bg-[#FBF8F2] px-4 py-12">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
          Nepodařilo se načíst poslední vydání: {latestRes.error.message}
        </div>
      </main>
    );
  }

  const latestEdition = latestRes.data as NewsEdition | null;
  if (!latestEdition) {
    return (
      <main className="mx-auto max-w-6xl bg-[#FBF8F2] px-4 py-12">
        <div className="border-2 border-verox-line bg-verox-card p-6 text-verox-charcoal">
          Zatím není publikované žádné vydání Jasných zpráv.
        </div>
      </main>
    );
  }

  const [itemsRes, recentEditionsRes] = await Promise.all([
    fetchPublishedItemsForEdition(supabase, latestEdition.id),
    fetchRecentPublishedEditions(supabase, RECENT_EDITIONS_LIMIT),
  ]);

  if (itemsRes.error) {
    return (
      <main className="mx-auto max-w-6xl bg-[#FBF8F2] px-4 py-12">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
          Nepodařilo se načíst obsah vydání: {itemsRes.error.message}
        </div>
      </main>
    );
  }

  const currentItems = [...((itemsRes.data ?? []) as NewsItem[])].sort(
    (a, b) => (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER),
  );

  const currentSourcesRes = await fetchSourcesForItemIds(
    supabase,
    currentItems.map((item) => item.id),
  );
  if (currentSourcesRes.error) {
    return (
      <main className="mx-auto max-w-6xl bg-[#FBF8F2] px-4 py-12">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
          Nepodařilo se načíst zdroje zpráv: {currentSourcesRes.error.message}
        </div>
      </main>
    );
  }

  const recentEditions = ((recentEditionsRes.data ?? []) as NewsEdition[]).sort(byEditionTimeDesc);
  const itemCountRes = await fetchPublishedItemCountsByEditionIds(
    supabase,
    recentEditions.map((edition) => edition.id),
  );
  const itemCounts = itemCountRes.counts;

  const todayKey = toPragueDayKey(new Date());
  const todayEditions = recentEditions
    .filter((edition) => toPragueDayKey(getEditionTimestamp(edition)) === todayKey)
    .sort(byEditionTimeDesc);

  const todayByType = new Map<"morning" | "noon" | "evening", NewsEdition>();
  for (const edition of todayEditions) {
    if (edition.edition_type === "morning" || edition.edition_type === "noon" || edition.edition_type === "evening") {
      if (!todayByType.has(edition.edition_type)) {
        todayByType.set(edition.edition_type, edition);
      }
    }
  }

  const tabs = (["morning", "noon", "evening"] as const).map((type) => {
    const edition = todayByType.get(type) ?? null;
    return {
      editionType: type,
      edition,
      status: edition ? "published" : "pending",
      itemCount: edition ? itemCounts.get(edition.id) ?? 0 : 0,
    } as const;
  });

  const sourcesByItem = groupSourcesByItemId(currentSourcesRes.data ?? []);
  const watchList = uniqueNonEmpty(currentItems.map((item) => item.what_to_watch), 5);
  const followups = currentItems.filter((item) => isFollowup(item));
  const bestSourced = [...currentItems]
    .sort(
      (a, b) =>
        getItemSourceCount(b, sourcesByItem) - getItemSourceCount(a, sourcesByItem) ||
        (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER),
    )
    .slice(0, 5);

  const todayOrdinal = dayKeyToOrdinal(todayKey);
  const archiveByDay = new Map<
    string,
    {
      dayKey: string;
      morning: { edition: NewsEdition | null; itemCount: number };
      noon: { edition: NewsEdition | null; itemCount: number };
      evening: { edition: NewsEdition | null; itemCount: number };
    }
  >();

  for (const edition of recentEditions) {
    const dayKey = toPragueDayKey(getEditionTimestamp(edition));
    const dayOrdinal = dayKeyToOrdinal(dayKey);
    if (todayOrdinal === null || dayOrdinal === null) continue;
    if (todayOrdinal - dayOrdinal > 6) continue;

    const existing = archiveByDay.get(dayKey) ?? {
      dayKey,
      morning: { edition: null, itemCount: 0 },
      noon: { edition: null, itemCount: 0 },
      evening: { edition: null, itemCount: 0 },
    };

    if (edition.edition_type === "morning" || edition.edition_type === "noon" || edition.edition_type === "evening") {
      if (!existing[edition.edition_type].edition) {
        existing[edition.edition_type] = {
          edition,
          itemCount: itemCounts.get(edition.id) ?? 0,
        };
      }
    }
    archiveByDay.set(dayKey, existing);
  }

  const archiveEntries = Array.from(archiveByDay.values())
    .sort((a, b) => b.dayKey.localeCompare(a.dayKey))
    .slice(0, 7);

  return (
    <main className="mx-auto w-full max-w-[1240px] bg-[#FBF8F2] px-4 py-8 text-verox-ink md:py-12">
      {itemCountRes.error ? (
        <div className="mb-6 border-l-2 border-verox-orange bg-verox-paperDeep px-4 py-3 text-sm text-verox-charcoal">
          Nepodařilo se načíst všechny počty zpráv. Obsah je zobrazen s dostupnými daty.
        </div>
      ) : null}

      <div className="space-y-6">
        <NewsroomHeader
          currentEdition={latestEdition}
          itemCount={itemCounts.get(latestEdition.id) ?? currentItems.length}
          timeToNextEditionLabel={getTimeToNextEditionLabel()}
        />
        <EditionTabs tabs={tabs} activeEditionSlug={latestEdition.slug} />
      </div>

      <div className="mt-12 grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="min-w-0 space-y-16">
          <TodayTopStories items={currentItems} editionSlug={latestEdition.slug} sourcesByItem={sourcesByItem} />
          <CurrentEditionView items={currentItems} editionSlug={latestEdition.slug} sourcesByItem={sourcesByItem} />
          <EditionsArchive entries={archiveEntries} />
        </section>

        <NewsroomSidebar
          editionsToday={tabs.map((tab) => ({
            type: tab.editionType,
            edition: tab.edition,
            itemCount: tab.itemCount,
          }))}
          watchList={watchList}
          followups={followups}
          bestSourced={bestSourced}
          sourcesByItem={sourcesByItem}
          currentEditionSlug={latestEdition.slug}
          archiveEditions={recentEditions.filter((edition) => edition.id !== latestEdition.id)}
        />
      </div>

      <div className="vx-meta mt-10 border-t-2 border-verox-line pt-4">
        Aktuální přehled: {currentItems.length} redakčních témat.
      </div>
    </main>
  );
}

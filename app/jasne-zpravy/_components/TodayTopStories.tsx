import Link from "next/link";
import {
  confidencePercent,
  getCategoryLabel,
  getItemSlug,
  getItemSourceCount,
  itemReadMinutes,
  neuroFrameLabel,
  oneLineLead,
  sourceCountLabel,
  type NewsItem,
  type NewsSource,
} from "@/lib/jasne-zpravy";

type TodayTopStoriesProps = {
  items: NewsItem[];
  editionSlug: string;
  sourcesByItem: Map<string, NewsSource[]>;
};

function itemRank(item: NewsItem): number {
  return item.rank ?? Number.MAX_SAFE_INTEGER;
}

function hasEditorialPick(item: NewsItem): boolean {
  const metadata = item.metadata as Record<string, unknown> | null;
  return metadata?.editorial_pick === true;
}

function pickTopStory(items: NewsItem[], sourcesByItem: Map<string, NewsSource[]>) {
  const editorial = items.filter(hasEditorialPick).sort((a, b) => itemRank(a) - itemRank(b));
  if (editorial.length > 0) return editorial[0];

  const domesticRankOne = items
    .filter((item) => item.category === "domestic" && item.rank === 1)
    .sort((a, b) => itemRank(a) - itemRank(b));
  if (domesticRankOne.length > 0) return domesticRankOne[0];

  const maxSources = Math.max(1, ...items.map((item) => getItemSourceCount(item, sourcesByItem)));
  const maxRank = Math.max(1, ...items.map((item) => item.rank ?? 99));
  const scored = [...items].sort((a, b) => {
    const aScore =
      (confidencePercent(a.confidence_score) / 100) * 0.55 +
      (getItemSourceCount(a, sourcesByItem) / maxSources) * 0.3 +
      (1 - (a.rank ?? maxRank) / maxRank) * 0.15;
    const bScore =
      (confidencePercent(b.confidence_score) / 100) * 0.55 +
      (getItemSourceCount(b, sourcesByItem) / maxSources) * 0.3 +
      (1 - (b.rank ?? maxRank) / maxRank) * 0.15;
    return bScore - aScore;
  });
  return scored[0] ?? null;
}

export function TodayTopStories({ items, editionSlug, sourcesByItem }: TodayTopStoriesProps) {
  const topStory = pickTopStory(items, sourcesByItem);
  const numberOfDay = items.find((item) => item.metadata?.neuro_frame === "number") ?? null;
  const curiosity = items.find((item) => item.category === "curiosity") ?? null;
  const watchItem = items.find((item) => item.what_to_watch?.trim()) ?? topStory;

  return (
    <section>
      <header className="mb-4 border-b border-gray-200 pb-3">
        <h2 className="text-2xl font-black text-gray-950">Hlavní zprávy dne</h2>
        <p className="mt-2 text-sm text-gray-600">Co je hlavní, co sledovat a kde je největší relevance.</p>
      </header>

      {!topStory ? (
        <p className="rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-600">
          Hlavní zpráva zatím není dostupná.
        </p>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <article className="rounded-3xl border border-[#FF6A00]/25 bg-white p-6 shadow-[0_10px_26px_rgba(17,17,17,0.08)]">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#B04A00]">
              {getCategoryLabel(topStory.category)}
            </p>
            <h3 className="mt-2 text-3xl font-black leading-tight text-gray-950">
              {topStory.short_headline ?? topStory.headline}
            </h3>
            <p className="mt-3 text-base leading-7 text-gray-700">{oneLineLead(topStory)}</p>
            {topStory.why_it_matters ? (
              <div className="mt-4 border-l-2 border-[#FF6A00] bg-[#fff7f1] px-3 py-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#B04A00]">Proč je to důležité</p>
                <p className="mt-1 text-sm leading-6 text-gray-700">{topStory.why_it_matters}</p>
              </div>
            ) : null}
            <div className="mt-4 h-1 w-full overflow-hidden rounded bg-gray-100">
              <div
                className="h-full rounded bg-[#FF6A00]"
                style={{ width: `${Math.max(8, confidencePercent(topStory.confidence_score))}%` }}
              />
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-gray-600">
                {sourceCountLabel(getItemSourceCount(topStory, sourcesByItem))} • {itemReadMinutes(topStory)} min •
                důvěra {confidencePercent(topStory.confidence_score)}%
              </p>
              <Link
                href={`/jasne-zpravy/${editionSlug}/${getItemSlug(topStory)}`}
                className="text-sm font-bold uppercase tracking-[0.08em] text-[#FF6A00] hover:text-[#cc5500]"
              >
                Číst zprávu
              </Link>
            </div>
          </article>

          <div className="space-y-3">
            <article className="rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-500">Co sledovat</p>
              <p className="mt-2 text-sm leading-6 text-gray-800">
                {watchItem?.what_to_watch ?? "Redakce zatím neoznačila konkrétní bod ke sledování."}
              </p>
            </article>
            <article className="rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-500">Číslo dne</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-gray-900">
                {numberOfDay?.short_headline ?? numberOfDay?.headline ?? "Dnes není dostupná položka s rámcem čísla."}
              </p>
              {numberOfDay ? (
                <p className="mt-1 text-xs text-gray-500">Rámec: {neuroFrameLabel(numberOfDay.metadata?.neuro_frame)}</p>
              ) : null}
            </article>
            <article className="rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-500">Kuriozita dne</p>
              {curiosity ? (
                <>
                  <p className="mt-2 text-sm font-semibold leading-6 text-gray-900">
                    {curiosity.short_headline ?? curiosity.headline}
                  </p>
                  <Link
                    href={`/jasne-zpravy/${editionSlug}/${getItemSlug(curiosity)}`}
                    className="mt-2 inline-flex text-xs font-bold uppercase tracking-[0.08em] text-[#FF6A00]"
                  >
                    Otevřít
                  </Link>
                </>
              ) : (
                <p className="mt-2 text-sm leading-6 text-gray-700">Kuriozita zatím není publikována.</p>
              )}
            </article>
          </div>
        </div>
      )}
    </section>
  );
}

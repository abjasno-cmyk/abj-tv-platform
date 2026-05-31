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
import { SectionLabel } from "@/components/abj/SectionLabel";
import { ArrowRight } from "@/components/abj/verox-icons";

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
      <SectionLabel index="(02)" title="Hlavní zprávy dne" kicker="Co je podstatné" />
      <p className="vx-meta mt-3 text-verox-charcoal">Co je hlavní, co sledovat a kde je největší relevance.</p>

      {!topStory ? (
        <p className="mt-5 border-2 border-verox-line bg-verox-card p-5 text-sm text-verox-charcoal">
          Hlavní zpráva zatím není dostupná.
        </p>
      ) : (
        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <article className="border-2 border-verox-ink bg-verox-card p-6 md:p-7">
            <p className="vx-kicker text-verox-orangeDeep">{getCategoryLabel(topStory.category)}</p>
            <h3 className="vx-display mt-2 text-verox-ink" style={{ fontSize: "clamp(1.7rem, 3.6vw, 2.6rem)", lineHeight: 1.02 }}>
              {topStory.short_headline ?? topStory.headline}
            </h3>
            <p className="mt-3 max-w-[60ch] text-[1.02rem] leading-relaxed text-verox-charcoal">{oneLineLead(topStory)}</p>
            {topStory.why_it_matters ? (
              <div className="mt-4 border-l-2 border-verox-orange bg-verox-paper px-4 py-3">
                <p className="vx-kicker text-verox-orangeDeep">Proč je to důležité</p>
                <p className="mt-1 text-sm leading-relaxed text-verox-charcoal">{topStory.why_it_matters}</p>
              </div>
            ) : null}
            <div className="mt-4 h-1 w-full overflow-hidden bg-verox-paperDeep">
              <div
                className="h-full bg-verox-orange"
                style={{ width: `${Math.max(8, confidencePercent(topStory.confidence_score))}%` }}
              />
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t-2 border-verox-line pt-4">
              <p className="vx-meta">
                {sourceCountLabel(getItemSourceCount(topStory, sourcesByItem))} • {itemReadMinutes(topStory)} min •
                důvěra {confidencePercent(topStory.confidence_score)}%
              </p>
              <Link href={`/jasne-zpravy/${editionSlug}/${getItemSlug(topStory)}`} className="vx-action">
                Číst zprávu <ArrowRight size={13} />
              </Link>
            </div>
          </article>

          <div className="space-y-4">
            <article className="border-2 border-verox-line bg-verox-card p-4">
              <p className="vx-kicker text-verox-gray">Co sledovat</p>
              <p className="mt-2 text-sm leading-relaxed text-verox-charcoal">
                {watchItem?.what_to_watch ?? "Redakce zatím neoznačila konkrétní bod ke sledování."}
              </p>
            </article>
            <article className="border-2 border-verox-line bg-verox-card p-4">
              <p className="vx-kicker text-verox-gray">Číslo dne</p>
              <p className="vx-display mt-2 text-verox-ink" style={{ fontSize: "1.05rem", lineHeight: 1.15 }}>
                {numberOfDay?.short_headline ?? numberOfDay?.headline ?? "Dnes není dostupná položka s rámcem čísla."}
              </p>
              {numberOfDay ? (
                <p className="vx-meta mt-1">Rámec: {neuroFrameLabel(numberOfDay.metadata?.neuro_frame)}</p>
              ) : null}
            </article>
            <article className="border-2 border-verox-line bg-verox-card p-4">
              <p className="vx-kicker text-verox-gray">Kuriozita dne</p>
              {curiosity ? (
                <>
                  <p className="vx-display mt-2 text-verox-ink" style={{ fontSize: "1.05rem", lineHeight: 1.15 }}>
                    {curiosity.short_headline ?? curiosity.headline}
                  </p>
                  <Link href={`/jasne-zpravy/${editionSlug}/${getItemSlug(curiosity)}`} className="vx-action mt-3">
                    Otevřít <ArrowRight size={13} />
                  </Link>
                </>
              ) : (
                <p className="mt-2 text-sm leading-relaxed text-verox-charcoal">Kuriozita zatím není publikována.</p>
              )}
            </article>
          </div>
        </div>
      )}
    </section>
  );
}

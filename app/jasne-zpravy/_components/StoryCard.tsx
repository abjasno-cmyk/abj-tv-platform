import Link from "next/link";
import {
  confidencePercent,
  getCategoryLabel,
  getItemSlug,
  getItemSourceCount,
  hasCzBridge,
  isCrossCheckConflict,
  isFollowup,
  itemReadMinutes,
  oneLineLead,
  sourceCountLabel,
  type NewsItem,
  type NewsSource,
} from "@/lib/jasne-zpravy";

type StoryCardProps = {
  item: NewsItem;
  editionSlug: string;
  sourcesByItem?: Map<string, NewsSource[]>;
  emphasize?: boolean;
};

export function StoryCard({ item, editionSlug, sourcesByItem, emphasize = false }: StoryCardProps) {
  const sourceCount = getItemSourceCount(item, sourcesByItem);
  const confidence = confidencePercent(item.confidence_score);
  const href = `/jasne-zpravy/${editionSlug}/${getItemSlug(item)}`;
  const czBridge = item.metadata?.cz_bridge?.trim();
  const lead = oneLineLead(item);

  return (
    <article
      className={`border bg-white ${
        emphasize
          ? "rounded-3xl border-[#FF6A00]/30 p-6 shadow-[0_10px_28px_rgba(17,17,17,0.08)]"
          : "rounded-2xl border-gray-200 p-4 shadow-sm"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center rounded-full bg-[#FF6A00]/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-[#B04A00]">
          {getCategoryLabel(item.category)}
        </span>
        {isFollowup(item) ? (
          <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-semibold text-gray-600">
            Navazuje
          </span>
        ) : null}
        {hasCzBridge(item) ? (
          <span className="rounded-full border border-[#1f4f9c]/20 bg-[#1f4f9c]/10 px-2.5 py-1 text-[11px] font-semibold text-[#1f4f9c]">
            Český dopad
          </span>
        ) : null}
        {isCrossCheckConflict(item) ? (
          <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
            Potvrzení se rozchází
          </span>
        ) : null}
      </div>

      <h3 className={`jz-headline mt-3 font-black text-gray-950 ${emphasize ? "text-[1.9rem]" : "text-xl"}`}>
        {item.short_headline ?? item.headline}
      </h3>
      <p className={`jz-deck mt-2 ${emphasize ? "text-base" : "text-sm"}`}>{lead}</p>

      {item.why_it_matters ? (
        <div className="mt-3 border-l-2 border-[#FF6A00] bg-[#fff7f1] px-3 py-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#B04A00]">Proč je to důležité</p>
          <p className="mt-1 text-sm leading-6 text-gray-700">{item.why_it_matters}</p>
        </div>
      ) : null}

      {czBridge ? (
        <div className="mt-3 rounded-xl border border-[#1f4f9c]/20 bg-[#eef4ff] px-3 py-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#1f4f9c]">Pro Česko znamená</p>
          <p className="mt-1 text-sm leading-6 text-[#1f335c]">{czBridge}</p>
        </div>
      ) : null}

      <div className="mt-4 h-1 w-full overflow-hidden rounded bg-gray-100">
        <div className="h-full rounded bg-[#FF6A00]" style={{ width: `${Math.max(8, confidence)}%` }} />
      </div>

      <footer className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
          <span>{sourceCountLabel(sourceCount)}</span>
          <span>•</span>
          <span>{itemReadMinutes(item)} min čtení</span>
          <span>•</span>
          <span>Důvěra {confidence}%</span>
        </div>
        <Link href={href} className="text-sm font-bold uppercase tracking-[0.08em] text-[#FF6A00] hover:text-[#cc5500]">
          Číst zprávu
        </Link>
      </footer>
    </article>
  );
}

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
import { ArrowRight } from "@/components/abj/verox-icons";

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
      className={`bg-verox-card ${
        emphasize ? "border-2 border-verox-ink p-6" : "border-2 border-verox-line p-4"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="vx-badge">{getCategoryLabel(item.category)}</span>
        {isFollowup(item) ? <span className="vx-badge vx-badge--ink">Navazuje</span> : null}
        {hasCzBridge(item) ? (
          <span className="vx-meta border border-verox-line px-2 py-1 text-verox-ink">Český dopad</span>
        ) : null}
        {isCrossCheckConflict(item) ? (
          <span className="vx-meta border border-verox-orange px-2 py-1 text-verox-orangeText">
            Potvrzení se rozchází
          </span>
        ) : null}
      </div>

      <h3
        className="vx-display mt-3 text-verox-ink"
        style={{ fontSize: emphasize ? "clamp(1.5rem, 3vw, 1.9rem)" : "1.25rem", lineHeight: 1.05 }}
      >
        {item.short_headline ?? item.headline}
      </h3>
      <p className={`mt-2 leading-relaxed text-verox-charcoal ${emphasize ? "text-base" : "text-sm"}`}>{lead}</p>

      {item.why_it_matters ? (
        <div className="mt-3 border-l-2 border-verox-orange bg-verox-paper px-3 py-2">
          <p className="vx-kicker text-verox-orangeDeep">Proč je to důležité</p>
          <p className="mt-1 text-sm leading-relaxed text-verox-charcoal">{item.why_it_matters}</p>
        </div>
      ) : null}

      {czBridge ? (
        <div className="mt-3 border-l-2 border-verox-ink bg-verox-paperDeep px-3 py-2">
          <p className="vx-kicker text-verox-ink">Pro Česko znamená</p>
          <p className="mt-1 text-sm leading-relaxed text-verox-charcoal">{czBridge}</p>
        </div>
      ) : null}

      <div className="mt-4 h-1 w-full overflow-hidden bg-verox-paperDeep">
        <div className="h-full bg-verox-orange" style={{ width: `${Math.max(8, confidence)}%` }} />
      </div>

      <footer className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t-2 border-verox-line pt-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="vx-meta">{sourceCountLabel(sourceCount)}</span>
          <span className="vx-meta">•</span>
          <span className="vx-meta">{itemReadMinutes(item)} min čtení</span>
          <span className="vx-meta">•</span>
          <span className="vx-meta">Důvěra {confidence}%</span>
        </div>
        <Link href={href} className="vx-action">
          Číst zprávu <ArrowRight size={13} />
        </Link>
      </footer>
    </article>
  );
}

import { NewsDetail } from "@/components/jasne-zpravy/NewsDetail";
import { JASNE_ZPRAVY_CATEGORY_LABELS } from "@/lib/jasneZpravyData";
import type { JasneZpravyItem } from "@/lib/jasneZpravyTypes";

type NewsCardProps = {
  item: JasneZpravyItem;
  expanded: boolean;
  onToggle: (itemId: string) => void;
};

function getAnchorId(item: JasneZpravyItem): string {
  if (item.slug && item.slug.trim().length > 0) {
    return item.slug.trim();
  }
  return item.id;
}

export function NewsCard({ item, expanded, onToggle }: NewsCardProps) {
  const anchorId = getAnchorId(item);
  const categoryLabel = JASNE_ZPRAVY_CATEGORY_LABELS[item.category];

  return (
    <article
      id={anchorId}
      className="rounded-2xl border border-[var(--abj-gold-dim)] bg-white p-4 shadow-[0_8px_22px_rgba(17,17,17,0.08)]"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.12em] text-[#FF6A00]">{categoryLabel}</p>
          <p className="mt-1 text-xs text-abj-text2">#{item.rank}</p>
        </div>
        <span className="rounded-full border border-[rgba(255,106,0,0.3)] bg-[rgba(255,106,0,0.08)] px-2 py-0.5 text-[11px] font-medium text-[#FF6A00]">
          Zdroje: {item.sourceCount}
        </span>
      </div>

      <h3 className="font-[var(--font-serif)] text-xl font-semibold leading-tight text-abj-text1">{item.headline}</h3>
      {item.lead ? <p className="mt-2 text-sm leading-relaxed text-abj-text2">{item.lead}</p> : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onToggle(item.id)}
          className="rounded-lg border border-[#FF6A00] bg-[#FF6A00] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-white"
        >
          {expanded ? "Skrýt zprávu" : "Číst zprávu"}
        </button>
        <button
          type="button"
          onClick={() => onToggle(item.id)}
          className="rounded-lg border border-[var(--abj-gold-dim)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-abj-text2"
        >
          Zdroje
        </button>
      </div>

      {expanded ? <NewsDetail item={item} /> : null}
    </article>
  );
}


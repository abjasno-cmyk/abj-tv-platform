import Link from "next/link";
import {
  getItemSlug,
  getItemSourceCount,
  itemReadMinutes,
  oneLineLead,
  sourceCountLabel,
  type NewsItem,
  type NewsSource,
} from "@/lib/jasne-zpravy";
import { ArrowRight } from "@/components/abj/verox-icons";

type StoryListItemProps = {
  item: NewsItem;
  editionSlug: string;
  order: number;
  sourcesByItem?: Map<string, NewsSource[]>;
};

export function StoryListItem({ item, editionSlug, order, sourcesByItem }: StoryListItemProps) {
  const href = `/jasne-zpravy/${editionSlug}/${getItemSlug(item)}`;
  const sourceCount = getItemSourceCount(item, sourcesByItem);

  return (
    <li className="border-b-2 border-verox-line py-3 last:border-b-0">
      <div className="grid gap-2 sm:grid-cols-[36px_minmax(0,1fr)_auto] sm:items-start sm:gap-3">
        <span className="vx-numeral" style={{ fontSize: "1.6rem" }}>{item.rank ?? order}</span>
        <div className="min-w-0">
          <h4 className="vx-display text-verox-ink" style={{ fontSize: "1.05rem", lineHeight: 1.2 }}>
            {item.short_headline ?? item.headline}
          </h4>
          <p className="mt-1 line-clamp-1 text-sm text-verox-charcoal">{oneLineLead(item)}</p>
          <p className="vx-meta mt-1">
            {sourceCountLabel(sourceCount)} • {itemReadMinutes(item)} min
          </p>
        </div>
        <Link href={href} className="vx-action">
          Číst <ArrowRight size={12} />
        </Link>
      </div>
    </li>
  );
}

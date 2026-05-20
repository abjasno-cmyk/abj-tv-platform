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
    <li className="border-b border-gray-100 py-3 last:border-b-0">
      <div className="grid gap-2 sm:grid-cols-[32px_minmax(0,1fr)_auto] sm:items-start sm:gap-3">
        <span className="text-sm font-bold text-gray-400">{item.rank ?? order}</span>
        <div className="min-w-0">
          <h4 className="text-base font-semibold leading-6 text-gray-900">{item.short_headline ?? item.headline}</h4>
          <p className="mt-1 line-clamp-1 text-sm text-gray-600">{oneLineLead(item)}</p>
          <p className="mt-1 text-xs text-gray-500">
            {sourceCountLabel(sourceCount)} • {itemReadMinutes(item)} min
          </p>
        </div>
        <Link
          href={href}
          className="inline-flex items-center text-xs font-bold uppercase tracking-[0.08em] text-[#FF6A00] hover:text-[#cc5500]"
        >
          Číst
        </Link>
      </div>
    </li>
  );
}

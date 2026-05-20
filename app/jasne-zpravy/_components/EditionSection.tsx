import { getCategoryLabel, type NewsItem, type NewsSource } from "@/lib/jasne-zpravy";
import { CuriosityCard } from "./CuriosityCard";
import { StoryCard } from "./StoryCard";
import { StoryListItem } from "./StoryListItem";

type EditionSectionProps = {
  title?: string;
  category: "domestic" | "foreign" | "curiosity";
  items: NewsItem[];
  editionSlug: string;
  sourcesByItem: Map<string, NewsSource[]>;
};

function itemRank(item: NewsItem): number {
  return item.rank ?? Number.MAX_SAFE_INTEGER;
}

export function EditionSection({ title, category, items, editionSlug, sourcesByItem }: EditionSectionProps) {
  const sorted = [...items].sort((a, b) => itemRank(a) - itemRank(b));
  if (sorted.length === 0) {
    return (
      <section>
        <h3 className="border-b border-gray-200 pb-2 text-sm font-bold uppercase tracking-[0.16em] text-gray-600">
          {title ?? getCategoryLabel(category)}
        </h3>
        <p className="mt-4 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
          V této sekci zatím nejsou publikované zprávy.
        </p>
      </section>
    );
  }

  if (category === "curiosity") {
    return (
      <section>
        <h3 className="border-b border-gray-200 pb-2 text-sm font-bold uppercase tracking-[0.16em] text-gray-600">
          {title ?? getCategoryLabel(category)}
        </h3>
        <div className="mt-4">
          <CuriosityCard item={sorted[0] ?? null} editionSlug={editionSlug} sourcesByItem={sourcesByItem} />
        </div>
      </section>
    );
  }

  const featured = sorted.slice(0, 3);
  const rest = sorted.slice(3);

  return (
    <section>
      <h3 className="border-b border-gray-200 pb-2 text-sm font-bold uppercase tracking-[0.16em] text-gray-600">
        {title ?? getCategoryLabel(category)}
      </h3>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {featured.map((item) => (
          <StoryCard key={item.id} item={item} editionSlug={editionSlug} sourcesByItem={sourcesByItem} />
        ))}
      </div>

      {rest.length > 0 ? (
        <ol className="mt-4 rounded-2xl border border-gray-200 bg-white px-4">
          {rest.map((item, index) => (
            <StoryListItem
              key={item.id}
              item={item}
              editionSlug={editionSlug}
              sourcesByItem={sourcesByItem}
              order={index + featured.length + 1}
            />
          ))}
        </ol>
      ) : null}
    </section>
  );
}

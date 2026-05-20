import { StoryCard } from "./StoryCard";
import type { NewsItem, NewsSource } from "@/lib/jasne-zpravy";

type CuriosityCardProps = {
  item: NewsItem | null;
  editionSlug: string;
  sourcesByItem?: Map<string, NewsSource[]>;
};

export function CuriosityCard({ item, editionSlug, sourcesByItem }: CuriosityCardProps) {
  if (!item) {
    return (
      <article className="rounded-2xl border border-dashed border-gray-300 bg-white p-4 text-sm text-gray-600">
        Kuriozita dne zatím není publikována.
      </article>
    );
  }

  return (
    <div>
      <StoryCard item={item} editionSlug={editionSlug} sourcesByItem={sourcesByItem} />
    </div>
  );
}

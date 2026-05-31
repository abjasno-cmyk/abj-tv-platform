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
      <article className="border-2 border-dashed border-verox-line bg-verox-card p-4 text-sm text-verox-charcoal">
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

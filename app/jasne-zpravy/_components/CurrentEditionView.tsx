import { EditionSection } from "./EditionSection";
import type { NewsItem, NewsSource } from "@/lib/jasne-zpravy";

type CurrentEditionViewProps = {
  items: NewsItem[];
  editionSlug: string;
  sourcesByItem: Map<string, NewsSource[]>;
};

function itemRank(item: NewsItem): number {
  return item.rank ?? Number.MAX_SAFE_INTEGER;
}

export function CurrentEditionView({ items, editionSlug, sourcesByItem }: CurrentEditionViewProps) {
  const sorted = [...items].sort((a, b) => itemRank(a) - itemRank(b));
  const domestic = sorted.filter((item) => item.category === "domestic");
  const foreign = sorted.filter((item) => item.category === "foreign");
  const curiosity = sorted.filter((item) => item.category === "curiosity");

  return (
    <section>
      <header className="mb-5 border-b border-gray-200 pb-4">
        <h2 className="text-2xl font-black leading-tight text-gray-950">Aktuální vydání</h2>
        <p className="mt-2 text-sm text-gray-600">
          Redakční struktura: Domácí, Zahraničí a jedna vybraná kuriozita.
        </p>
      </header>
      <div className="space-y-8">
        <EditionSection
          category="domestic"
          title="Domácí"
          items={domestic}
          editionSlug={editionSlug}
          sourcesByItem={sourcesByItem}
        />
        <EditionSection
          category="foreign"
          title="Zahraničí"
          items={foreign}
          editionSlug={editionSlug}
          sourcesByItem={sourcesByItem}
        />
        <EditionSection
          category="curiosity"
          title="Kuriozita"
          items={curiosity}
          editionSlug={editionSlug}
          sourcesByItem={sourcesByItem}
        />
      </div>
    </section>
  );
}

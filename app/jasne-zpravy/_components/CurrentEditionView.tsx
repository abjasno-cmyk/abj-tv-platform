import { EditionSection } from "./EditionSection";
import { SectionLabel } from "@/components/abj/SectionLabel";
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
      <SectionLabel index="(03)" title="Aktuální vydání" kicker="Den po dni" />
      <p className="vx-meta mt-3 text-verox-charcoal">
        Redakční struktura: Domácí, Zahraničí a jedna vybraná kuriozita.
      </p>
      <div className="mt-6 space-y-10">
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

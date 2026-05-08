import { NewsCard } from "@/components/jasne-zpravy/NewsCard";
import { JASNE_ZPRAVY_CATEGORY_LABELS } from "@/lib/jasneZpravyData";
import type { JasneZpravyCategory, JasneZpravyItem } from "@/lib/jasneZpravyTypes";

type NewsSectionProps = {
  category: JasneZpravyCategory;
  items: JasneZpravyItem[];
  expandedItemId: string | null;
  onToggleItem: (itemId: string) => void;
};

export function NewsSection({ category, items, expandedItemId, onToggleItem }: NewsSectionProps) {
  const label = JASNE_ZPRAVY_CATEGORY_LABELS[category];
  return (
    <section className="space-y-3">
      <header className="flex items-center justify-between">
        <h2 className="font-[var(--font-serif)] text-2xl font-semibold text-abj-text1">{label}</h2>
        <span className="text-xs uppercase tracking-[0.08em] text-abj-text2">{items.length} zpráv</span>
      </header>

      {items.length === 0 ? (
        <p className="rounded-xl border border-[var(--abj-gold-dim)] bg-white px-4 py-4 text-sm text-abj-text2">
          V této sekci zatím nejsou zveřejněné zprávy.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {items.map((item) => (
            <NewsCard
              key={item.id}
              item={item}
              expanded={expandedItemId === item.id}
              onToggle={onToggleItem}
            />
          ))}
        </div>
      )}
    </section>
  );
}


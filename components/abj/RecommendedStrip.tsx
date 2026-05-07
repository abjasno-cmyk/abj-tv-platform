"use client";

import Image from "next/image";

type RecommendedItem = {
  id: string;
  title: string;
  reason: string;
  image: string | null;
  fallbackImage: string;
};

type RecommendedStripProps = {
  items: RecommendedItem[];
  onSelect?: (id: string) => void;
};

export function RecommendedStrip({ items, onSelect }: RecommendedStripProps) {
  const visible = items.slice(0, 3);

  return (
    <section className="relative mx-auto w-full max-w-[1200px] px-5 pb-8">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-extrabold tracking-tight text-abj-text1">Doporučeno</h3>
        <p className="text-xs uppercase tracking-[0.16em] text-abj-text2">3 výběry</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {visible.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect?.(item.id)}
            className="group relative overflow-hidden rounded-2xl border border-abj-goldDim bg-abj-card text-left shadow-[0_10px_30px_rgba(17,17,17,0.08)] transition-all duration-300 hover:-translate-y-[2px] hover:shadow-[0_16px_36px_rgba(17,17,17,0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A00] focus-visible:ring-offset-2"
          >
            <div className="relative aspect-[16/9] w-full overflow-hidden bg-abj-panel">
              {item.image ? (
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  sizes="(min-width: 1024px) 33vw, 100vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  unoptimized
                />
              ) : (
                <Image
                  src={item.fallbackImage}
                  alt={item.title}
                  fill
                  sizes="(min-width: 1024px) 33vw, 100vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  unoptimized
                />
              )}
              <span className="pointer-events-none absolute right-3 top-3 h-6 w-6 rounded-full border border-[#FF6A00]/35 bg-[#FF6A00]/10" />
            </div>

            <div className="space-y-2 px-4 py-4">
              <p className="line-clamp-2 text-sm font-bold leading-snug text-abj-text1">{item.title}</p>
              <p className="line-clamp-2 text-xs leading-relaxed text-abj-text2">{item.reason}</p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

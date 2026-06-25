import Link from "next/link";

import type { NovinySourceRow } from "@/lib/noviny/types";

type NovinySourceListProps = {
  sources: NovinySourceRow[];
  activeSlug?: string;
};

export function NovinySourceList({ sources, activeSlug }: NovinySourceListProps) {
  return (
    <section className="rounded-2xl border border-[var(--abj-gold-dim)] bg-white p-4 shadow-sm">
      <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-abj-text2">Zdroje</h2>
      <ul className="mt-3 space-y-2">
        {sources.map((source) => {
          const active = source.slug === activeSlug;
          return (
            <li key={source.id}>
              <Link
                href={`/noviny/zdroj/${source.slug}`}
                className={`block rounded-lg border px-3 py-2 text-sm font-semibold ${
                  active
                    ? "border-[#FF6A00]/45 bg-[#FF6A00]/10 text-[#B04A00]"
                    : "border-[var(--abj-gold-dim)] text-abj-text1 hover:border-[#FF6A00]/35"
                }`}
              >
                {source.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

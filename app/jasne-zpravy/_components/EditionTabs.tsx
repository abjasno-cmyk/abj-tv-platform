import Link from "next/link";
import {
  formatPragueTime,
  getEditionTimestamp,
  getEditionTypeLabel,
  type NewsEdition,
} from "@/lib/jasne-zpravy";

type EditionTabsProps = {
  tabs: Array<{
    editionType: "morning" | "noon" | "evening";
    edition: NewsEdition | null;
    itemCount: number;
    status: "published" | "pending";
  }>;
  activeEditionSlug: string;
};

export function EditionTabs({ tabs, activeEditionSlug }: EditionTabsProps) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.16em] text-gray-600">Dnešní vydání</h2>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {tabs.map((tab) => {
          const isActive = tab.edition?.slug === activeEditionSlug;
          const label = getEditionTypeLabel(tab.editionType);
          const inner = (
            <article
              className={`min-w-[220px] rounded-2xl border p-3 transition ${
                isActive
                  ? "border-[#FF6A00] bg-[#fff7f0] shadow-[0_8px_20px_rgba(255,106,0,0.18)]"
                  : "border-gray-200 bg-white hover:border-[#FF6A00]/35"
              }`}
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-500">{label}</p>
              <p className="mt-1 text-sm font-semibold text-gray-900">
                {tab.edition?.title ?? `${label} vydání`}
              </p>
              <p className="mt-1 text-xs text-gray-600">
                {tab.edition ? formatPragueTime(getEditionTimestamp(tab.edition)) : "čeká se"}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {tab.status === "published" ? "publikováno" : "čeká se"} • {tab.itemCount} zpráv
              </p>
            </article>
          );

          if (!tab.edition) return <div key={tab.editionType}>{inner}</div>;
          return (
            <Link key={tab.editionType} href={`/jasne-zpravy/${tab.edition.slug}`}>
              {inner}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

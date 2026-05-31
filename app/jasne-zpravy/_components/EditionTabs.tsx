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
      <div className="flex items-center gap-x-5">
        <span className="vx-kicker text-verox-gray">Dnešní vydání</span>
        <hr className="vx-rule h-[2px] flex-1" />
      </div>
      <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
        {tabs.map((tab) => {
          const isActive = tab.edition?.slug === activeEditionSlug;
          const label = getEditionTypeLabel(tab.editionType);
          const inner = (
            <article
              className={`min-w-[220px] border-2 bg-verox-card p-4 transition ${
                isActive
                  ? "border-verox-orange shadow-[0_8px_20px_rgba(243,112,33,0.18)]"
                  : "border-verox-line hover:border-verox-orange"
              }`}
            >
              <p className="vx-kicker text-verox-gray">{label}</p>
              <p className="vx-display mt-2 text-verox-ink" style={{ fontSize: "1.1rem", lineHeight: 1.1 }}>
                {tab.edition?.title ?? `${label} vydání`}
              </p>
              <p className="vx-meta mt-2 text-verox-orangeDeep">
                {tab.edition ? formatPragueTime(getEditionTimestamp(tab.edition)) : "čeká se"}
              </p>
              <p className="vx-meta mt-1">
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

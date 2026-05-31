import Link from "next/link";
import {
  formatPragueDate,
  formatPragueTime,
  getEditionTimestamp,
  getEditionTypeLabel,
  getItemSlug,
  getItemSourceCount,
  sourceCountLabel,
  type NewsEdition,
  type NewsItem,
  type NewsSource,
} from "@/lib/jasne-zpravy";

type NewsroomSidebarProps = {
  editionsToday: Array<{ type: "morning" | "noon" | "evening"; edition: NewsEdition | null; itemCount: number }>;
  watchList: string[];
  followups: NewsItem[];
  bestSourced: NewsItem[];
  sourcesByItem: Map<string, NewsSource[]>;
  currentEditionSlug: string;
  archiveEditions: NewsEdition[];
};

function SidebarHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-x-4">
      <h2 className="vx-kicker text-verox-ink">{children}</h2>
      <hr className="vx-rule-soft mt-1 flex-1" />
    </div>
  );
}

export function NewsroomSidebar({
  editionsToday,
  watchList,
  followups,
  bestSourced,
  sourcesByItem,
  currentEditionSlug,
  archiveEditions,
}: NewsroomSidebarProps) {
  return (
    <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
      <section className="border-2 border-verox-line bg-verox-card p-4">
        <SidebarHeading>Dnešní vydání</SidebarHeading>
        <ul className="mt-3 divide-y-2 divide-verox-line">
          {editionsToday.map(({ type, edition, itemCount }) => (
            <li key={type} className="py-2 text-sm">
              <p className="vx-kicker text-verox-ink">{getEditionTypeLabel(type)}</p>
              {edition ? (
                <Link href={`/jasne-zpravy/${edition.slug}`} className="vx-meta mt-1 block hover:text-verox-orangeText">
                  {formatPragueTime(getEditionTimestamp(edition))} • {itemCount} zpráv
                </Link>
              ) : (
                <p className="vx-meta mt-1">čeká se</p>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="border-2 border-verox-line bg-verox-card p-4">
        <SidebarHeading>Co sledovat dál</SidebarHeading>
        {watchList.length === 0 ? (
          <p className="mt-3 text-sm text-verox-charcoal">Zatím bez bodů ke sledování.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {watchList.map((point) => (
              <li key={point} className="flex gap-2 text-sm leading-relaxed text-verox-charcoal">
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 bg-verox-orange" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="border-2 border-verox-line bg-verox-card p-4">
        <SidebarHeading>Navazuje na předchozí vydání</SidebarHeading>
        {followups.length === 0 ? (
          <p className="mt-3 text-sm text-verox-charcoal">Dnes zatím bez návazných zpráv.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {followups.slice(0, 5).map((item) => (
              <li key={item.id}>
                <Link
                  href={`/jasne-zpravy/${currentEditionSlug}/${getItemSlug(item)}`}
                  className="block border-2 border-verox-line px-3 py-2 text-sm font-medium text-verox-ink hover:border-verox-orange"
                >
                  {item.short_headline ?? item.headline}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="border-2 border-verox-line bg-verox-card p-4">
        <SidebarHeading>Nejlépe ozdrojováno</SidebarHeading>
        {bestSourced.length === 0 ? (
          <p className="mt-3 text-sm text-verox-charcoal">Zdrojová data zatím chybí.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {bestSourced.slice(0, 5).map((item) => (
              <li key={item.id}>
                <Link
                  href={`/jasne-zpravy/${currentEditionSlug}/${getItemSlug(item)}`}
                  className="flex items-center justify-between gap-2 border-2 border-verox-line px-3 py-2 hover:border-verox-orange"
                >
                  <span className="line-clamp-2 text-sm font-medium text-verox-ink">{item.short_headline ?? item.headline}</span>
                  <span className="vx-meta shrink-0">{sourceCountLabel(getItemSourceCount(item, sourcesByItem))}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="border-2 border-verox-line bg-verox-card p-4">
        <SidebarHeading>Archiv 7 dní</SidebarHeading>
        {archiveEditions.length === 0 ? (
          <p className="mt-3 text-sm text-verox-charcoal">Archiv zatím není dostupný.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {archiveEditions.slice(0, 7).map((edition) => (
              <li key={edition.id}>
                <Link
                  href={`/jasne-zpravy/${edition.slug}`}
                  className="flex items-center justify-between gap-2 border-2 border-verox-line px-3 py-2 hover:border-verox-orange"
                >
                  <span className="text-sm font-medium text-verox-ink">{formatPragueDate(getEditionTimestamp(edition))}</span>
                  <span className="vx-meta shrink-0">{getEditionTypeLabel(edition.edition_type)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  );
}

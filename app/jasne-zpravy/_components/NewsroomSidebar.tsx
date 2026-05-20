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
    <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-gray-500">Dnešní vydání</h2>
        <ul className="mt-3 space-y-2">
          {editionsToday.map(({ type, edition, itemCount }) => (
            <li key={type} className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
              <p className="font-semibold text-gray-900">{getEditionTypeLabel(type)}</p>
              {edition ? (
                <Link href={`/jasne-zpravy/${edition.slug}`} className="mt-1 block text-xs text-gray-600 hover:text-[#FF6A00]">
                  {formatPragueTime(getEditionTimestamp(edition))} • {itemCount} zpráv
                </Link>
              ) : (
                <p className="mt-1 text-xs text-gray-500">čeká se</p>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-gray-500">Co sledovat dál</h2>
        {watchList.length === 0 ? (
          <p className="mt-3 text-sm text-gray-600">Zatím bez bodů ke sledování.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {watchList.map((point) => (
              <li key={point} className="flex gap-2 text-sm leading-6 text-gray-800">
                <span className="mt-[7px] h-1.5 w-1.5 rounded-full bg-[#FF6A00]" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-gray-500">Navazuje na předchozí vydání</h2>
        {followups.length === 0 ? (
          <p className="mt-3 text-sm text-gray-600">Dnes zatím bez návazných zpráv.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {followups.slice(0, 5).map((item) => (
              <li key={item.id}>
                <Link
                  href={`/jasne-zpravy/${currentEditionSlug}/${getItemSlug(item)}`}
                  className="block rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-900 hover:border-[#FF6A00]/35"
                >
                  {item.short_headline ?? item.headline}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-gray-500">Nejlépe ozdrojováno</h2>
        {bestSourced.length === 0 ? (
          <p className="mt-3 text-sm text-gray-600">Zdrojová data zatím chybí.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {bestSourced.slice(0, 5).map((item) => (
              <li key={item.id}>
                <Link
                  href={`/jasne-zpravy/${currentEditionSlug}/${getItemSlug(item)}`}
                  className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2 hover:border-[#FF6A00]/35"
                >
                  <span className="line-clamp-2 text-sm font-medium text-gray-900">{item.short_headline ?? item.headline}</span>
                  <span className="text-xs text-gray-500">
                    {sourceCountLabel(getItemSourceCount(item, sourcesByItem))}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-gray-500">Archiv 7 dní</h2>
        {archiveEditions.length === 0 ? (
          <p className="mt-3 text-sm text-gray-600">Archiv zatím není dostupný.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {archiveEditions.slice(0, 7).map((edition) => (
              <li key={edition.id}>
                <Link
                  href={`/jasne-zpravy/${edition.slug}`}
                  className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2 hover:border-[#FF6A00]/35"
                >
                  <span className="text-sm font-medium text-gray-900">{formatPragueDate(getEditionTimestamp(edition))}</span>
                  <span className="text-xs text-gray-500">{getEditionTypeLabel(edition.edition_type)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  );
}

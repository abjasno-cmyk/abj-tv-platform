import Link from "next/link";
import {
  formatPragueDateTime,
  getEditionTimestamp,
  getEditionTypeLabel,
  type NewsEdition,
} from "@/lib/jasne-zpravy";

type NewsroomHeaderProps = {
  currentEdition: NewsEdition;
  itemCount: number;
  timeToNextEditionLabel: string | null;
};

export function NewsroomHeader({ currentEdition, itemCount, timeToNextEditionLabel }: NewsroomHeaderProps) {
  return (
    <header className="rounded-3xl border border-[#FF6A00]/20 bg-gradient-to-b from-[#fffaf3] via-[#fffdfa] to-white p-6 shadow-[0_12px_30px_rgba(17,17,17,0.06)] md:p-8">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <p className="jz-kicker text-xs font-bold text-[#B04A00]">ABJ NEWSROOM</p>
          <h1 className="jz-headline-display mt-2 text-3xl font-black text-gray-950 md:text-5xl">Jasné zprávy</h1>
          <p className="jz-deck mt-3 max-w-2xl text-base">
            Ráno. Poledne. Večer. Bez zbytečné mlhy.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#FF6A00] px-3 py-1 text-xs font-bold uppercase tracking-[0.08em] text-white">
              {getEditionTypeLabel(currentEdition.edition_type)} vydání
            </span>
            <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700">
              {formatPragueDateTime(getEditionTimestamp(currentEdition))}
            </span>
            <span className="rounded-full border border-[#FF6A00]/20 bg-[#FF6A00]/10 px-3 py-1 text-xs font-semibold text-[#B04A00]">
              {itemCount} zpráv
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <Link
            href={`/jasne-zpravy/${currentEdition.slug}`}
            className="inline-flex min-h-10 items-center rounded-lg bg-[#FF6A00] px-4 py-2 text-sm font-bold text-white hover:bg-[#e45f00]"
          >
            Číst aktuální vydání
          </Link>
          <Link
            href="/jasne-zpravy/archiv"
            className="inline-flex min-h-10 items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:border-[#FF6A00]/40 hover:text-[#FF6A00]"
          >
            Archiv
          </Link>
        </div>
      </div>
      {timeToNextEditionLabel ? (
        <p className="mt-4 text-sm font-medium text-gray-600">Další plánované vydání za {timeToNextEditionLabel}.</p>
      ) : null}
    </header>
  );
}

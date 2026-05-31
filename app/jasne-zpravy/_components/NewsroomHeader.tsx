import Link from "next/link";
import {
  formatPragueDateTime,
  getEditionTimestamp,
  getEditionTypeLabel,
  type NewsEdition,
} from "@/lib/jasne-zpravy";
import { DayNumeral } from "@/components/abj/DayNumeral";
import { dayNumeralParts } from "./day-numeral-parts";

type NewsroomHeaderProps = {
  currentEdition: NewsEdition;
  itemCount: number;
  timeToNextEditionLabel: string | null;
};

export function NewsroomHeader({ currentEdition, itemCount, timeToNextEditionLabel }: NewsroomHeaderProps) {
  const { day, month } = dayNumeralParts(getEditionTimestamp(currentEdition));
  return (
    <header className="border-y-2 border-verox-ink bg-verox-card px-6 py-8 md:px-8 md:py-10">
      <div className="grid gap-7 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-end">
        <div className="hidden shrink-0 lg:block">
          <DayNumeral day={day} month={month} />
        </div>

        <div className="min-w-0">
          <p className="vx-kicker text-verox-orangeDeep">ABJ Newsroom</p>
          <h1 className="vx-display mt-3 text-verox-ink" style={{ fontSize: "clamp(2.4rem, 6vw, 4.4rem)", lineHeight: 0.96 }}>
            Jasné zprávy
          </h1>
          <p className="vx-meta mt-3 max-w-2xl text-verox-charcoal">Ráno. Poledne. Večer. Bez zbytečné mlhy.</p>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="vx-badge">{getEditionTypeLabel(currentEdition.edition_type)} vydání</span>
            <span className="vx-badge vx-badge--ink">{formatPragueDateTime(getEditionTimestamp(currentEdition))}</span>
            <span className="vx-meta text-verox-orangeDeep">{itemCount} zpráv</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 lg:flex-col lg:items-stretch lg:justify-end">
          <Link href={`/jasne-zpravy/${currentEdition.slug}`} className="vx-btn vx-btn--solid vx-btn--sm">
            Číst aktuální vydání
          </Link>
          <Link href="/jasne-zpravy/archiv" className="vx-btn vx-btn--ghost-ink vx-btn--sm">
            Archiv
          </Link>
        </div>
      </div>
      {timeToNextEditionLabel ? (
        <p className="vx-meta mt-6 border-t border-verox-line pt-4 text-verox-charcoal">
          Další plánované vydání za {timeToNextEditionLabel}.
        </p>
      ) : null}
    </header>
  );
}

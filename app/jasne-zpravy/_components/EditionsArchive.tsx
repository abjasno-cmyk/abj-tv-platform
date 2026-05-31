import Link from "next/link";
import { formatPragueDateWithWeekday, formatPragueTime, getEditionTimestamp, type NewsEdition } from "@/lib/jasne-zpravy";
import { SectionLabel } from "@/components/abj/SectionLabel";
import { DayNumeral } from "@/components/abj/DayNumeral";
import { ArrowRight } from "@/components/abj/verox-icons";
import { dayNumeralParts } from "./day-numeral-parts";

type EditionsArchiveEntry = {
  dayKey: string;
  morning: { edition: NewsEdition | null; itemCount: number };
  noon: { edition: NewsEdition | null; itemCount: number };
  evening: { edition: NewsEdition | null; itemCount: number };
};

type EditionsArchiveProps = {
  entries: EditionsArchiveEntry[];
};

function slotLabel(key: "morning" | "noon" | "evening"): string {
  if (key === "morning") return "Ranní";
  if (key === "noon") return "Polední";
  return "Večerní";
}

export function EditionsArchive({ entries }: EditionsArchiveProps) {
  return (
    <section>
      <SectionLabel index="(04)" title="Archiv vydání" kicker="Poslední dny" />
      <p className="vx-meta mt-3 text-verox-charcoal">Poslední dny rozdělené na ranní, polední a večerní blok.</p>
      {entries.length === 0 ? (
        <p className="mt-5 border-2 border-verox-line bg-verox-card p-4 text-sm text-verox-charcoal">
          Archiv posledních dní zatím není dostupný.
        </p>
      ) : (
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          {entries.map((entry) => {
            const dateRef =
              entry.morning.edition ?? entry.noon.edition ?? entry.evening.edition ?? null;
            const dateLabel = dateRef ? formatPragueDateWithWeekday(getEditionTimestamp(dateRef)) : entry.dayKey;
            const numeral = dayNumeralParts(dateRef ? getEditionTimestamp(dateRef) : null);
            return (
              <article key={entry.dayKey} className="border-2 border-verox-line bg-verox-card p-5">
                <div className="flex items-center gap-4 border-b-2 border-verox-line pb-3">
                  <DayNumeral day={numeral.day} month={numeral.month} size="sm" />
                  <h3 className="vx-display text-verox-ink" style={{ fontSize: "1.05rem", lineHeight: 1.15 }}>
                    {dateLabel}
                  </h3>
                </div>
                <ul className="mt-3 divide-y-2 divide-verox-line">
                  {(["morning", "noon", "evening"] as const).map((slot) => {
                    const item = entry[slot];
                    return (
                      <li key={`${entry.dayKey}-${slot}`} className="py-2 text-sm">
                        <p className="vx-kicker text-verox-ink">{slotLabel(slot)}</p>
                        {item.edition ? (
                          <Link href={`/jasne-zpravy/${item.edition.slug}`} className="vx-meta mt-1 block hover:text-verox-orangeText">
                            {formatPragueTime(getEditionTimestamp(item.edition))} • {item.itemCount} zpráv
                          </Link>
                        ) : (
                          <p className="vx-meta mt-1">nepublikováno</p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </article>
            );
          })}
        </div>
      )}
      <div className="mt-5">
        <Link href="/jasne-zpravy/archiv" className="vx-action">
          Zobrazit celý archiv <ArrowRight size={13} />
        </Link>
      </div>
    </section>
  );
}

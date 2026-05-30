import Link from "next/link";
import { formatPragueDateWithWeekday, formatPragueTime, getEditionTimestamp, type NewsEdition } from "@/lib/jasne-zpravy";

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
      <header className="mb-4 border-b border-gray-200 pb-3">
        <h2 className="text-xl font-black text-gray-950">Archiv vydání</h2>
        <p className="mt-1 text-sm text-gray-600">Poslední dny rozdělené na ranní, polední a večerní blok.</p>
      </header>
      {entries.length === 0 ? (
        <p className="rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
          Archiv posledních dní zatím není dostupný.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {entries.map((entry) => {
            const dateRef =
              entry.morning.edition ?? entry.noon.edition ?? entry.evening.edition ?? null;
            const dateLabel = dateRef ? formatPragueDateWithWeekday(getEditionTimestamp(dateRef)) : entry.dayKey;
            return (
              <article key={entry.dayKey} className="rounded-2xl border border-gray-200 bg-white p-4">
                <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-gray-600">{dateLabel}</h3>
                <ul className="mt-3 space-y-2">
                  {(["morning", "noon", "evening"] as const).map((slot) => {
                    const item = entry[slot];
                    return (
                      <li key={`${entry.dayKey}-${slot}`} className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
                        <p className="font-semibold text-gray-900">{slotLabel(slot)}</p>
                        {item.edition ? (
                          <Link href={`/jasne-zpravy/${item.edition.slug}`} className="mt-1 block text-xs text-gray-600 hover:text-[#F37021]">
                            {formatPragueTime(getEditionTimestamp(item.edition))} • {item.itemCount} zpráv
                          </Link>
                        ) : (
                          <p className="mt-1 text-xs text-gray-500">nepublikováno</p>
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
      <div className="mt-4">
        <Link href="/jasne-zpravy/archiv" className="text-sm font-bold text-[#F37021] hover:text-[#cc5500]">
          Zobrazit celý archiv →
        </Link>
      </div>
    </section>
  );
}

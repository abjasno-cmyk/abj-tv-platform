import type { JasneZpravySource } from "@/lib/jasneZpravyTypes";

type SourceListProps = {
  sources: JasneZpravySource[];
};

function formatSourceDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("cs-CZ", {
    timeZone: "Europe/Prague",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function SourceList({ sources }: SourceListProps) {
  if (sources.length === 0) {
    return (
      <p className="rounded-lg border border-[var(--abj-gold-dim)] bg-[rgba(255,255,255,0.55)] px-3 py-2 text-sm text-abj-text2">
        Zdroje k této zprávě zatím nejsou zveřejněny.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {sources.map((source) => {
        const publishedAt = formatSourceDate(source.publishedAt);
        return (
          <li key={source.id} className="rounded-lg border border-[var(--abj-gold-dim)] bg-[rgba(255,255,255,0.7)] p-3">
            <p className="text-sm font-semibold text-abj-text1">{source.title}</p>
            <p className="mt-1 text-xs text-abj-text2">
              {source.sourceName ?? "Neznámý zdroj"}
              {publishedAt ? ` · ${publishedAt}` : ""}
            </p>
            {source.quoteOrExcerpt ? (
              <p className="mt-2 text-sm leading-relaxed text-abj-text1">{source.quoteOrExcerpt.slice(0, 240)}</p>
            ) : null}
            {source.sourceUrl ? (
              <a
                href={source.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex text-xs font-semibold uppercase tracking-[0.08em] text-[#FF6A00] underline decoration-[rgba(255,106,0,0.5)] underline-offset-2"
              >
                Otevřít zdroj
              </a>
            ) : (
              <p className="mt-2 text-xs text-abj-text2">URL zdroje není zveřejněna.</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}


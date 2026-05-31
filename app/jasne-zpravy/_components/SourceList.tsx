import { formatPragueDateTime, type NewsSource } from "@/lib/jasne-zpravy";

type SourceListProps = {
  sources: NewsSource[];
};

function sourceTypeLabel(value: string | null): string {
  if (!value) return "neuvedeno";
  return value;
}

export function SourceList({ sources }: SourceListProps) {
  return (
    <section>
      <h3 className="vx-kicker text-verox-ink">Zdroje</h3>
      {sources.length === 0 ? (
        <p className="mt-3 border-2 border-verox-line bg-verox-card p-4 text-sm text-verox-charcoal">
          U této zprávy zatím nejsou dostupné zdroje.
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {sources.map((source) => (
            <li key={source.id} className="border-2 border-verox-line bg-verox-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-verox-ink">{source.source_name ?? "Zdroj"}</p>
                  <p className="mt-1 text-sm text-verox-charcoal">{source.source_title ?? "Bez titulku"}</p>
                </div>
                {source.source_url ? (
                  <a
                    href={source.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="vx-action"
                  >
                    Otevřít zdroj
                  </a>
                ) : null}
              </div>
              <p className="vx-meta mt-2">
                {formatPragueDateTime(source.published_at)} • {source.language ?? "jazyk neuveden"} •{" "}
                {sourceTypeLabel(source.source_type)}
              </p>
              <p className="vx-meta mt-1">
                Relevance: {source.relevance_score ?? "neuvedeno"} • Důvěryhodnost:{" "}
                {source.credibility_note ?? "bez poznámky"}
              </p>
              {source.quote_or_excerpt ? (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs font-semibold text-verox-charcoal">Náhled citace / excerptu</summary>
                  <p className="mt-2 border-2 border-verox-line bg-verox-paper p-3 text-sm text-verox-charcoal">
                    {source.quote_or_excerpt}
                  </p>
                </details>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

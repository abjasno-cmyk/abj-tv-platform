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
      <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-gray-600">Zdroje</h3>
      {sources.length === 0 ? (
        <p className="mt-3 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
          U této zprávy zatím nejsou dostupné zdroje.
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {sources.map((source) => (
            <li key={source.id} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{source.source_name ?? "Zdroj"}</p>
                  <p className="mt-1 text-sm text-gray-700">{source.source_title ?? "Bez titulku"}</p>
                </div>
                {source.source_url ? (
                  <a
                    href={source.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold uppercase tracking-[0.08em] text-[#1f4f9c] hover:underline"
                  >
                    Otevřít zdroj
                  </a>
                ) : null}
              </div>
              <p className="mt-2 text-xs text-gray-500">
                {formatPragueDateTime(source.published_at)} • {source.language ?? "jazyk neuveden"} •{" "}
                {sourceTypeLabel(source.source_type)}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Relevance: {source.relevance_score ?? "neuvedeno"} • Důvěryhodnost:{" "}
                {source.credibility_note ?? "bez poznámky"}
              </p>
              {source.quote_or_excerpt ? (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs font-semibold text-gray-700">Náhled citace / excerptu</summary>
                  <p className="mt-2 rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm text-gray-700">
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

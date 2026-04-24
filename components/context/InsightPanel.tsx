"use client";

type InsightPanelProps = {
  loading: boolean;
  headline: string | null;
  bullets: string[];
};

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-6 w-2/3 animate-pulse rounded bg-gray-800" />
      <div className="h-5 w-full animate-pulse rounded bg-gray-800" />
      <div className="h-5 w-5/6 animate-pulse rounded bg-gray-800" />
      <div className="h-5 w-4/5 animate-pulse rounded bg-gray-800" />
    </div>
  );
}

export function InsightPanel({ loading, headline, bullets }: InsightPanelProps) {
  return (
    <aside className="rounded-xl border border-yellow-400/30 bg-yellow-500/10 p-4">
      <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-yellow-200">Co to znamená</h3>
      <div className="mt-3">
        {loading ? <LoadingSkeleton /> : null}
        {!loading ? (
          <div className="space-y-2">
            {headline ? <p className="text-base font-semibold text-abj-text1">{headline}</p> : null}
            {bullets.map((line) => (
              <p key={line} className="text-sm leading-relaxed text-abj-text1">
                {line}
              </p>
            ))}
            {headline === null && bullets.length === 0 ? (
              <p className="text-sm text-abj-text2">Insight zatím není dostupný.</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </aside>
  );
}

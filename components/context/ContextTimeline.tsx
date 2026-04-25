"use client";

export type ContextTimelineItem = {
  id: string;
  time: string;
  claim: string;
  context: string;
  sourceTitle?: string;
  sourceUrl?: string;
  status: "podporovano" | "rozporuplne" | "nejasne";
};

type ContextTimelineProps = {
  items: ContextTimelineItem[];
  activeId: string | null;
  onSeek: (item: ContextTimelineItem) => void;
};

function statusTone(status: ContextTimelineItem["status"]): string {
  if (status === "podporovano") return "border-l-4 border-emerald-400";
  if (status === "rozporuplne") return "border-l-4 border-red-400";
  return "border-l-4 border-gray-500";
}

export function ContextTimeline({ items, activeId, onSeek }: ContextTimelineProps) {
  if (items.length === 0) {
    return (
      <section className="rounded-xl border border-[var(--abj-gold-dim)] bg-[var(--card)] p-4">
        <div className="h-24 animate-pulse rounded bg-gray-800/70" />
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-[var(--abj-gold-dim)] bg-[var(--card)] p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.1em] text-abj-text2">Context timeline</h2>
      <div className="space-y-3">
        {items.map((item) => {
          const active = item.id === activeId;
          return (
            <article
              key={item.id}
              className={`rounded-md bg-[#0D182B] p-3 transition-all ${statusTone(item.status)} ${
                active ? "ring-1 ring-yellow-400/55" : "ring-1 ring-transparent"
              }`}
            >
              <button type="button" onClick={() => onSeek(item)} className="text-left">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-abj-gold">{item.time}</p>
                <p className="mt-1 text-sm font-semibold text-abj-text1">{item.claim}</p>
              </button>
              <p className="mt-2 text-sm leading-relaxed text-abj-text2">{item.context}</p>
              {item.sourceUrl ? (
                <a
                  href={item.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block text-xs text-sky-300 hover:text-sky-200"
                >
                  Zdroj: {item.sourceTitle ?? "Otevřít"}
                </a>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}

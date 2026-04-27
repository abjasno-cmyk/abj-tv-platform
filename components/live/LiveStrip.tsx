"use client";

type LiveStripProps = {
  viewers: number;
  headline: string;
};

function formatViewers(realViewers: number): string {
  return new Intl.NumberFormat("cs-CZ").format(9999 + Math.max(0, Math.floor(realViewers)));
}

export function LiveStrip({ viewers, headline }: LiveStripProps) {
  return (
    <div className="sticky top-[46px] z-30 border-b border-red-500/40 bg-[linear-gradient(90deg,rgba(30,5,11,0.97),rgba(8,17,34,0.96),rgba(5,23,45,0.96))] shadow-[0_8px_24px_rgba(0,0,0,0.45)] backdrop-blur">
      <div className="relative flex min-h-12 items-center gap-3 px-3 py-2 sm:px-4">
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-red-300/70 bg-red-500/25 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-red-100">
          <span className="h-2 w-2 animate-pulse rounded-full bg-red-300" />
          LIVE
        </span>
        <span className="shrink-0 text-xs font-bold text-sky-100 sm:text-sm">
          {formatViewers(viewers)} sleduje
        </span>
        <p className="line-clamp-1 min-w-0 text-xs font-medium text-slate-100 sm:text-sm">{headline}</p>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-sky-400/15 to-transparent"
        />
      </div>
    </div>
  );
}

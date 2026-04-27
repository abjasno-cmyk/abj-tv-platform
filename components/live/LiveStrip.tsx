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
    <div className="sticky top-0 z-40 border-b border-red-500/30 bg-[linear-gradient(90deg,rgba(20,7,10,0.95),rgba(10,18,34,0.95))] backdrop-blur">
      <div className="flex min-h-11 items-center gap-3 px-3 py-2 sm:px-4">
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-red-400/50 bg-red-500/20 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-red-200">
          <span className="h-2 w-2 animate-pulse rounded-full bg-red-400" />
          LIVE
        </span>
        <span className="shrink-0 text-xs font-semibold text-sky-100 sm:text-sm">
          {formatViewers(viewers)} sleduje
        </span>
        <p className="line-clamp-1 min-w-0 text-xs text-slate-100 sm:text-sm">{headline}</p>
      </div>
    </div>
  );
}

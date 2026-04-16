"use client";

type ProgramMoment = {
  title: string;
  start: string;
  end: string;
};

type NowNextBarProps = {
  nowItem: ProgramMoment | null;
  nextItem: ProgramMoment | null;
};

function formatPragueClock(iso: string): string {
  return new Intl.DateTimeFormat("cs-CZ", {
    timeZone: "Europe/Prague",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

function diffMinutesFromNow(iso: string): number {
  const target = new Date(iso).getTime();
  const now = Date.now();
  return Math.max(0, Math.round((target - now) / 60_000));
}

export function NowNextBar({ nowItem, nextItem }: NowNextBarProps) {
  const nextCountdown = nextItem ? diffMinutesFromNow(nextItem.start) : null;

  return (
    <section className="flex items-center gap-[22px] border-b border-abj-goldDim bg-abj-panel px-5 py-[11px]">
      <div className="min-w-0">
        <p className="font-[var(--font-sans)] text-[9px] uppercase tracking-[0.18em] text-abj-gold">Teď</p>
        <div className="flex items-baseline gap-2">
          <p className="truncate font-[var(--font-serif)] text-[14px] font-normal text-abj-text1">
            {nowItem?.title ?? "Bez aktuálního pořadu"}
          </p>
          <span className="font-[var(--font-sans)] text-[11px] text-abj-text2">
            {nowItem ? `${formatPragueClock(nowItem.start)}–${formatPragueClock(nowItem.end)}` : ""}
          </span>
        </div>
      </div>

      <span className="h-[22px] w-px bg-abj-goldDim" />

      <div className="min-w-0">
        <p className="font-[var(--font-sans)] text-[9px] uppercase tracking-[0.18em] text-abj-text2">Dále</p>
        <div className="flex items-baseline gap-2">
          <p className="truncate font-[var(--font-serif)] text-[14px] font-normal text-abj-text1">
            {nextItem?.title ?? "Program se aktualizuje"}
          </p>
          <span className="font-[var(--font-sans)] text-[11px] text-abj-text2">
            {nextItem ? `za ${nextCountdown ?? 0} min` : ""}
          </span>
        </div>
      </div>
    </section>
  );
}

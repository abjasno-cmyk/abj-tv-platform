"use client";

type ProgramMoment = {
  title: string;
  start: string;
  end: string;
};

type NowNextBarProps = {
  previousItem: ProgramMoment | null;
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

function diffMinutesSince(iso: string): number {
  const target = new Date(iso).getTime();
  const now = Date.now();
  return Math.max(0, Math.round((now - target) / 60_000));
}

export function NowNextBar({ previousItem, nowItem, nextItem }: NowNextBarProps) {
  const nextCountdown = nextItem ? diffMinutesFromNow(nextItem.start) : null;
  const prevCountdown = previousItem ? diffMinutesSince(previousItem.end) : null;

  return (
    <section className="border-b border-abj-goldDim bg-gradient-to-r from-abj-panel to-[#081326] px-5 py-[11px]">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="min-w-0 rounded border border-[#20354F] bg-[#0A1729] px-3 py-2">
          <p className="font-[var(--font-sans)] text-[9px] uppercase tracking-[0.18em] text-abj-text2">Předtím</p>
          <div className="flex items-baseline justify-between gap-2">
            <p className="truncate font-[var(--font-serif)] text-[14px] font-normal text-abj-text1">
              {previousItem?.title ?? "Není k dispozici"}
            </p>
            <span className="shrink-0 font-[var(--font-sans)] text-[11px] text-abj-text3">
              {previousItem ? `před ${prevCountdown ?? 0} min` : ""}
            </span>
          </div>
          <p className="mt-1 font-[var(--font-sans)] text-[11px] text-abj-text3">
            {previousItem
              ? `${formatPragueClock(previousItem.start)}–${formatPragueClock(previousItem.end)}`
              : ""}
          </p>
        </div>

        <div className="min-w-0 rounded border border-[rgba(198,168,91,0.45)] bg-[linear-gradient(180deg,#0F223A,#081425)] px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_10px_24px_rgba(0,0,0,0.35)]">
          <p className="font-[var(--font-sans)] text-[9px] uppercase tracking-[0.18em] text-abj-gold">Teď běží</p>
          <div className="flex items-baseline justify-between gap-2">
            <p className="truncate font-[var(--font-serif)] text-[15px] font-semibold text-abj-text1">
              {nowItem?.title ?? "Bez aktuálního pořadu"}
            </p>
            <span className="shrink-0 font-[var(--font-sans)] text-[11px] text-abj-gold">
              LIVE
            </span>
          </div>
          <p className="mt-1 font-[var(--font-sans)] text-[11px] text-abj-text2">
            {nowItem ? `${formatPragueClock(nowItem.start)}–${formatPragueClock(nowItem.end)}` : ""}
          </p>
        </div>

        <div className="min-w-0 rounded border border-[#20354F] bg-[#0A1729] px-3 py-2">
          <p className="font-[var(--font-sans)] text-[9px] uppercase tracking-[0.18em] text-abj-text2">Za chvíli</p>
          <div className="flex items-baseline justify-between gap-2">
            <p className="truncate font-[var(--font-serif)] text-[14px] font-normal text-abj-text1">
              {nextItem?.title ?? "Program se aktualizuje"}
            </p>
            <span className="shrink-0 font-[var(--font-sans)] text-[11px] text-abj-text2">
              {nextItem ? `za ${nextCountdown ?? 0} min` : ""}
            </span>
          </div>
          <p className="mt-1 font-[var(--font-sans)] text-[11px] text-abj-text3">
            {nextItem ? `${formatPragueClock(nextItem.start)}–${formatPragueClock(nextItem.end)}` : ""}
          </p>
        </div>
      </div>
    </section>
  );
}

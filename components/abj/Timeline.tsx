"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { DayProgram, ProgramItem } from "@/lib/epg-types";

type TimelineProps = {
  days: DayProgram[];
  onSelect: (item: ProgramItem) => void;
};

function typeLabel(item: ProgramItem): string {
  if (item.type === "live") return "Live";
  if (item.type === "upcoming") return "Premiéra";
  return "Archiv";
}

function parseTimeToMinutes(value: string): number | null {
  const [hoursRaw, minutesRaw] = value.split(":");
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function getPragueNowParts(date: Date): { dateKey: string; minutesOfDay: number } {
  const parts = new Intl.DateTimeFormat("cs-CZ", {
    timeZone: "Europe/Prague",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, part) => {
      if (part.type !== "literal") acc[part.type] = part.value;
      return acc;
    }, {});

  const hours = Number(parts.hour ?? "0");
  const minutes = Number(parts.minute ?? "0");
  return {
    dateKey: `${parts.year ?? "1970"}-${parts.month ?? "01"}-${parts.day ?? "01"}`,
    minutesOfDay: hours * 60 + minutes,
  };
}

function itemKey(item: ProgramItem, idx: number): string {
  return `${item.videoId ?? "item"}-${item.time}-${idx}`;
}

type CurrentSlot = {
  key: string;
  progressPct: number;
};

type ScrollState = {
  left: number;
  max: number;
};

function resolveCurrentSlot(items: ProgramItem[], activeDate: string | undefined, now: Date): CurrentSlot | null {
  if (!activeDate || items.length === 0) return null;
  const pragueNow = getPragueNowParts(now);
  if (pragueNow.dateKey !== activeDate) return null;

  for (let idx = 0; idx < items.length; idx += 1) {
    const current = items[idx];
    const next = items[idx + 1];
    const startMinutes = parseTimeToMinutes(current.time);
    if (startMinutes === null) continue;
    const nextMinutes = parseTimeToMinutes(next?.time ?? "");
    const endMinutes = nextMinutes !== null && nextMinutes > startMinutes ? nextMinutes : Math.min(startMinutes + 60, 24 * 60);
    if (pragueNow.minutesOfDay < startMinutes || pragueNow.minutesOfDay >= endMinutes) continue;

    const range = endMinutes - startMinutes;
    const elapsed = pragueNow.minutesOfDay - startMinutes;
    const progressPct = range > 0 ? Math.max(0, Math.min(100, (elapsed / range) * 100)) : 0;
    return {
      key: itemKey(current, idx),
      progressPct,
    };
  }

  return null;
}

function itemTone(item: ProgramItem, active: boolean, isCurrentTime: boolean): string {
  if (active) {
    return "border-abj-red bg-abj-red text-white shadow-[0_14px_30px_rgba(255,106,0,0.26)]";
  }
  if (isCurrentTime) {
    return "border-[#FF6A00]/55 bg-[rgba(255,106,0,0.11)] text-abj-text1 shadow-[0_10px_24px_rgba(255,106,0,0.14)]";
  }
  if (item.type === "live") {
    return "border-abj-red bg-white text-abj-red";
  }
  return "border-[rgba(17,17,17,0.24)] bg-white text-abj-text2";
}

export function Timeline({ days, onSelect }: TimelineProps) {
  const [activeDayIndex, setActiveDayIndex] = useState(() => {
    const todayKey = getPragueNowParts(new Date()).dateKey;
    const todayIndex = days.findIndex((day) => day.date === todayKey);
    return todayIndex >= 0 ? todayIndex : 0;
  });
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [scrollState, setScrollState] = useState<ScrollState>({ left: 0, max: 0 });
  const timelineScrollRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const autoScrolledDayRef = useRef<string | null>(null);

  const activeDay = days[activeDayIndex] ?? days[0];
  const items = useMemo(() => activeDay?.items ?? [], [activeDay]);
  const dateLabel = activeDay?.label ?? "Program";
  const currentSlot = useMemo(() => resolveCurrentSlot(items, activeDay?.date, now), [activeDay?.date, items, now]);
  const canPrevDay = activeDayIndex > 0;
  const canNextDay = activeDayIndex < days.length - 1;
  const canScrollTimeline = scrollState.max > 6;
  const canScrollLeft = scrollState.left > 6;
  const canScrollRight = scrollState.left < scrollState.max - 6;

  const updateScrollState = useCallback(() => {
    const container = timelineScrollRef.current;
    if (!container) {
      setScrollState({ left: 0, max: 0 });
      return;
    }
    setScrollState({
      left: Math.max(0, container.scrollLeft),
      max: Math.max(0, container.scrollWidth - container.clientWidth),
    });
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    autoScrolledDayRef.current = null;
  }, [activeDay?.date]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => updateScrollState());
    const onResize = () => updateScrollState();
    window.addEventListener("resize", onResize);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
    };
  }, [items.length, updateScrollState]);

  useEffect(() => {
    const container = timelineScrollRef.current;
    if (!container) return;
    const onScroll = () => updateScrollState();
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, [activeDay?.date, updateScrollState]);

  useEffect(() => {
    if (!activeDay?.date || !currentSlot) return;
    if (autoScrolledDayRef.current === activeDay.date) return;
    const container = timelineScrollRef.current;
    const target = itemRefs.current[currentSlot.key];
    if (!container || !target) return;

    const targetLeft = target.offsetLeft - container.clientWidth / 2 + target.clientWidth / 2;
    container.scrollTo({
      left: Math.max(0, targetLeft),
      behavior: "smooth",
    });
    autoScrolledDayRef.current = activeDay.date;
    window.setTimeout(() => updateScrollState(), 360);
  }, [activeDay?.date, currentSlot, updateScrollState]);

  return (
    <section className="rounded-[26px] border border-abj-goldDim bg-abj-panel px-5 py-4 shadow-[0_12px_28px_rgba(17,17,17,0.06)]">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-abj-text2">Timeline</p>
        <div className="flex items-center gap-3">
          {currentSlot ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(255,106,0,0.12)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#C14900]">
              <span className="h-2 w-2 rounded-full bg-[#FF6A00]" />
              Teď běží
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => setActiveDayIndex((prev) => Math.max(0, prev - 1))}
            disabled={!canPrevDay}
            className="rounded-full border border-[rgba(17,17,17,0.2)] bg-white px-2 py-1 text-xs text-abj-text2 transition enabled:hover:border-[#FF6A00] enabled:hover:text-[#C14900] disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Předchozí den timeline"
          >
            ←
          </button>
          <p className="min-w-[165px] text-center text-sm font-semibold text-abj-text1">{dateLabel}</p>
          <button
            type="button"
            onClick={() => setActiveDayIndex((prev) => Math.min(days.length - 1, prev + 1))}
            disabled={!canNextDay}
            className="rounded-full border border-[rgba(17,17,17,0.2)] bg-white px-2 py-1 text-xs text-abj-text2 transition enabled:hover:border-[#FF6A00] enabled:hover:text-[#C14900] disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Následující den timeline"
          >
            →
          </button>
        </div>
      </div>

      <div
        ref={timelineScrollRef}
        className="abj-dot-grid -mx-1 overflow-x-scroll rounded-2xl border border-[rgba(17,17,17,0.11)] bg-white p-3"
      >
        <div className="flex min-w-max gap-3">
          {items.length === 0 ? (
            <p className="px-2 py-4 text-sm text-abj-text2">Program se připravuje.</p>
          ) : (
            items.map((item, idx) => {
              const key = itemKey(item, idx);
              const active = selectedKey === key;
              const isCurrentTime = currentSlot?.key === key;
              return (
                <button
                  key={key}
                  type="button"
                  ref={(node) => {
                    itemRefs.current[key] = node;
                  }}
                  onClick={() => {
                    setSelectedKey(key);
                    onSelect(item);
                  }}
                  className={`group flex min-h-[130px] w-[154px] flex-col justify-between rounded-[24px] border p-4 text-left transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-abj-red/40 ${itemTone(
                    item,
                    active,
                    isCurrentTime
                  )}`}
                >
                  <span className="text-[11px] font-bold tracking-[0.08em]">{item.time}</span>
                  <div>
                    <p className="line-clamp-2 text-sm font-semibold leading-tight text-current">{item.title}</p>
                    <p
                      className={`mt-1 text-[11px] ${
                        active ? "text-white/80" : isCurrentTime ? "text-[#B45309]" : "text-abj-text3"
                      }`}
                    >
                      {typeLabel(item)}
                    </p>
                    {isCurrentTime ? (
                      <div className="mt-2 h-1.5 w-full rounded-full bg-[rgba(255,106,0,0.2)]">
                        <div
                          className="h-full rounded-full bg-[#FF6A00] transition-[width] duration-500"
                          style={{ width: `${currentSlot?.progressPct ?? 0}%` }}
                        />
                      </div>
                    ) : null}
                  </div>
                  <span
                    className={`h-4 w-4 rounded-full border transition ${
                      active
                        ? "border-white bg-white"
                        : isCurrentTime
                          ? "border-[#FF6A00] bg-[#FF6A00]/20"
                          : "border-[rgba(17,17,17,0.32)] bg-transparent group-hover:border-abj-red"
                    }`}
                    aria-hidden="true"
                  />
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            const container = timelineScrollRef.current;
            if (!container) return;
            container.scrollBy({ left: -260, behavior: "smooth" });
          }}
          disabled={!canScrollTimeline || !canScrollLeft}
          className="rounded-full border border-[rgba(17,17,17,0.24)] bg-white px-3 py-1 text-xs font-semibold text-abj-text2 transition enabled:hover:border-[#FF6A00] enabled:hover:text-[#C14900] disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Posunout timeline doleva"
        >
          ←
        </button>
        <input
          type="range"
          min={0}
          max={Math.max(1, Math.round(scrollState.max))}
          value={Math.min(Math.round(scrollState.left), Math.max(1, Math.round(scrollState.max)))}
          onChange={(event) => {
            const container = timelineScrollRef.current;
            if (!container) return;
            container.scrollTo({
              left: Number(event.currentTarget.value),
              behavior: "auto",
            });
          }}
          className="h-1.5 w-full cursor-pointer accent-[#FF6A00] disabled:cursor-not-allowed"
          disabled={!canScrollTimeline}
          aria-label="Posuvník timeline"
        />
        <button
          type="button"
          onClick={() => {
            const container = timelineScrollRef.current;
            if (!container) return;
            container.scrollBy({ left: 260, behavior: "smooth" });
          }}
          disabled={!canScrollTimeline || !canScrollRight}
          className="rounded-full border border-[rgba(17,17,17,0.24)] bg-white px-3 py-1 text-xs font-semibold text-abj-text2 transition enabled:hover:border-[#FF6A00] enabled:hover:text-[#C14900] disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Posunout timeline doprava"
        >
          →
        </button>
      </div>
    </section>
  );
}

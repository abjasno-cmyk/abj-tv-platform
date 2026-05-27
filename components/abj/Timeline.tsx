"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { DayProgram, ProgramItem } from "@/lib/epg-types";

type TimelineProps = {
  days: DayProgram[];
  onSelect: (item: ProgramItem) => void;
};

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

function resolveThumbnail(item: ProgramItem): string {
  const thumbnail = item.thumbnail?.trim();
  if (thumbnail) return thumbnail;
  return "/placeholder-thumb.jpg";
}

export function Timeline({ days, onSelect }: TimelineProps) {
  const activeDayIndex = useMemo(() => {
    const todayKey = getPragueNowParts(new Date()).dateKey;
    const todayIndex = days.findIndex((day) => day.date === todayKey);
    return todayIndex >= 0 ? todayIndex : 0;
  }, [days]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [scrollState, setScrollState] = useState<ScrollState>({ left: 0, max: 0 });
  const timelineScrollRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const autoScrolledDayRef = useRef<string | null>(null);

  const activeDay = days[activeDayIndex] ?? days[0];
  const items = useMemo(() => activeDay?.items ?? [], [activeDay]);
  const currentSlot = useMemo(() => resolveCurrentSlot(items, activeDay?.date, now), [activeDay?.date, items, now]);
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
    <section className="bg-white px-5 py-5 font-[Helvetica,Arial,sans-serif] text-[#111111]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-[clamp(1.35rem,2.3vw,2rem)] font-black leading-tight text-[#111111]">
            Vyberte <span className="text-[#ED742F]">video</span> podle data
          </h3>
          <p className="text-xs text-[#111111]/60">Kliknutím na náhled spustíte video v hlavním přehrávači.</p>
        </div>
        {currentSlot ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(237,116,47,0.14)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#111111]">
            <span className="h-2 w-2 rounded-full bg-[#ED742F]" />
            Teď běží
          </span>
        ) : null}
      </div>

      <div ref={timelineScrollRef} className="-mx-1 overflow-x-auto p-3">
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
                  className={`group w-[166px] shrink-0 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ED742F]/45 ${
                    active ? "scale-[1.01]" : ""
                  }`}
                >
                  <div className="relative overflow-hidden rounded-[14px] shadow-[0_8px_18px_rgba(17,17,17,0.16)]">
                    <div className="relative aspect-[16/9] w-full bg-black">
                      <img
                        src={resolveThumbnail(item)}
                        alt={item.title}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />
                      {isCurrentTime ? <div className="pointer-events-none absolute inset-0 bg-[#ED742F]/45" /> : null}
                      <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/65 px-2 py-0.5 text-[10px] font-semibold tracking-[0.08em] text-white">
                        {item.time}
                      </span>
                    </div>
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-xs font-semibold leading-snug text-[#111111]">{item.title}</p>
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className="mt-5 space-y-2">
        <div className="flex items-center gap-2">
          <p className="text-sm font-black uppercase leading-none tracking-[0.08em] text-[#111111] sm:text-[33px] sm:tracking-[0.06em]">
            Timelines
          </p>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const container = timelineScrollRef.current;
                if (!container) return;
                container.scrollBy({ left: -260, behavior: "smooth" });
              }}
              disabled={!canScrollTimeline || !canScrollLeft}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#111111] bg-white text-xs font-bold text-[#111111] transition disabled:opacity-35 sm:h-8 sm:w-8 sm:text-sm"
              aria-label="Posunout timeline doleva"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => {
                const container = timelineScrollRef.current;
                if (!container) return;
                container.scrollBy({ left: 260, behavior: "smooth" });
              }}
              disabled={!canScrollTimeline || !canScrollRight}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#ED742F] bg-[#ED742F] text-xs font-bold text-white transition disabled:opacity-35 sm:h-8 sm:w-8 sm:text-sm"
              aria-label="Posunout timeline doprava"
            >
              →
            </button>
          </div>
        </div>
        <div className="relative h-4 w-full overflow-hidden rounded-[2px] bg-[#ED742F] sm:h-5">
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
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            disabled={!canScrollTimeline}
            aria-label="Posuvník timeline"
          />
        </div>
      </div>
    </section>
  );
}

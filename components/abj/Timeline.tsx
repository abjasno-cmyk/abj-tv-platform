"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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
  const timelineScrollRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const autoScrolledDayRef = useRef<string | null>(null);

  const activeDay = days[activeDayIndex] ?? days[0];
  const items = useMemo(() => activeDay?.items ?? [], [activeDay]);
  const dateLabel = activeDay?.label ?? "Program";
  const currentSlot = useMemo(() => resolveCurrentSlot(items, activeDay?.date, now), [activeDay?.date, items, now]);

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
  }, [activeDay?.date, currentSlot]);

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
          <p className="text-sm font-semibold text-abj-text1">{dateLabel}</p>
        </div>
      </div>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {days.map((day, idx) => {
          const active = idx === activeDayIndex;
          return (
            <button
              key={day.date}
              type="button"
              onClick={() => setActiveDayIndex(idx)}
              className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] transition ${
                active
                  ? "border-abj-red bg-abj-red text-white"
                  : "border-[rgba(17,17,17,0.2)] bg-white text-abj-text2 hover:bg-[rgba(255,106,0,0.1)] hover:text-abj-text1"
              }`}
            >
              {day.label}
            </button>
          );
        })}
      </div>

      <div
        ref={timelineScrollRef}
        className="abj-dot-grid -mx-1 overflow-x-auto rounded-2xl border border-[rgba(17,17,17,0.11)] bg-white p-3"
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
    </section>
  );
}

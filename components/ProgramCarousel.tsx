"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import type { DayProgram, ProgramItem } from "@/lib/epg-types";

type ProgramCarouselProps = {
  days: DayProgram[];
  onVideoSelect: (videoId: string, title: string, channelName: string) => void;
};

type ScrollPositions = Record<number, number>;

function getCurrentPragueTime(): string {
  const parts = new Intl.DateTimeFormat("cs-CZ", {
    timeZone: "Europe/Prague",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const map = parts.reduce<Record<string, string>>((acc, part) => {
    if (part.type !== "literal") {
      acc[part.type] = part.value;
    }
    return acc;
  }, {});

  return `${map.hour ?? "00"}:${map.minute ?? "00"}`;
}

function findCurrentItem(items: ProgramItem[], currentTime: string): ProgramItem | null {
  let current: ProgramItem | null = null;
  for (const item of items) {
    if (item.time <= currentTime) {
      current = item;
    }
  }
  return current;
}

export function ProgramCarousel({ days, onVideoSelect }: ProgramCarouselProps) {
  const [activeDay, setActiveDay] = useState(() => {
    const firstPopulatedDay = days.findIndex((day) => day.items.length > 0);
    return firstPopulatedDay >= 0 ? firstPopulatedDay : 0;
  });
  const [nowTime, setNowTime] = useState<string>(() => getCurrentPragueTime());
  const scrollPositions = useRef<ScrollPositions>({});
  const rowRef = useRef<HTMLUListElement | null>(null);

  const activeProgram = days[activeDay];

  useEffect(() => {
    const timer = setInterval(() => {
      setNowTime(getCurrentPragueTime());
    }, 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!rowRef.current) return;
    rowRef.current.scrollLeft = scrollPositions.current[activeDay] ?? 0;
  }, [activeDay]);

  const currentTodayItem = useMemo(() => {
    if (!days[0]?.items?.length) return null;
    return findCurrentItem(days[0].items, nowTime);
  }, [days, nowTime]);

  if (!days.length) {
    return (
      <section className="space-y-3">
        <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--text-soft)]">Program</p>
        <p className="py-8 text-sm text-[var(--text-soft)]">Pro tento den není plánované vysílání</p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--text-soft)]">
        Program — {activeProgram?.label}
      </p>

      <div className="overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="inline-flex gap-2 whitespace-nowrap">
          {days.map((day, idx) => {
            const isActive = idx === activeDay;
            return (
              <button
                key={day.date}
                type="button"
                onClick={() => {
                  if (rowRef.current) {
                    scrollPositions.current[activeDay] = rowRef.current.scrollLeft;
                  }
                  setActiveDay(idx);
                }}
                className={
                  isActive
                    ? "min-h-12 rounded-full bg-[var(--accent-blue)] px-4 py-2 text-sm text-white transition-all duration-200 ease-out"
                    : "min-h-12 px-4 py-2 text-sm text-[var(--text-soft)] transition-all duration-200 ease-out hover:text-[var(--text-main)]"
                }
              >
                {day.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeProgram?.items?.length ? (
        <ul
          ref={rowRef}
          className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {activeProgram.items.map((item) => {
            const isPlayable = Boolean(item.videoId);
            const isNow =
              activeDay === 0 &&
              currentTodayItem !== null &&
              currentTodayItem.videoId === item.videoId &&
              currentTodayItem.time === item.time;

            return (
              <li
                key={`${activeProgram.date}-${item.time}-${item.videoId ?? item.title}`}
                className="snap-start"
              >
                <button
                  type="button"
                  onClick={() => {
                    if (!item.videoId) return;
                    onVideoSelect(item.videoId, item.title, item.channelName);
                  }}
                  disabled={!isPlayable}
                  className={`min-h-12 w-44 cursor-pointer overflow-hidden rounded-xl transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] ${
                    item.isABJ
                      ? "bg-[var(--abj-glow)] ring-1 ring-[rgba(59,130,246,0.3)]"
                      : "bg-[var(--surface-warm)]"
                  } ${isNow ? "ring-1 ring-[#FF6A00]" : ""} ${
                    isPlayable ? "" : "cursor-default opacity-75"
                  }`}
                >
                  <div className="relative">
                    <Image
                      src={item.thumbnail ?? "/placeholder-thumb.jpg"}
                      alt={item.title}
                      width={320}
                      height={180}
                      className="aspect-video w-full object-cover"
                      unoptimized={item.thumbnail !== null}
                    />
                    {isNow ? (
                      <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] uppercase tracking-wide text-[#FF6A00]">
                        ● Nyní
                      </span>
                    ) : null}
                  </div>

                  <div className="p-3 text-left">
                    <p className="text-xs font-bold text-[var(--accent-blue)]">{item.time}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs font-medium text-[var(--text-main)]">
                      {item.title}
                    </p>
                    <p className="mt-1 text-[11px] text-[var(--text-soft)]">{item.channelName}</p>
                    {!isPlayable ? (
                      <p className="mt-1 text-[10px] uppercase tracking-wide text-[var(--text-soft)]">
                        Programový blok
                      </p>
                    ) : null}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="py-8 text-center text-sm text-[var(--text-soft)]">
          Pro tento den není plánované vysílání
        </p>
      )}
    </section>
  );
}

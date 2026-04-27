"use client";

import { useMemo, useState } from "react";

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

function itemTone(item: ProgramItem, active: boolean): string {
  if (active) {
    return "border-abj-red bg-abj-red text-white shadow-[0_14px_30px_rgba(227,6,19,0.26)]";
  }
  if (item.type === "live") {
    return "border-abj-red bg-white text-abj-red";
  }
  return "border-[rgba(17,17,17,0.24)] bg-white text-abj-text2";
}

export function Timeline({ days, onSelect }: TimelineProps) {
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const activeDay = days[activeDayIndex] ?? days[0];
  const items = useMemo(() => activeDay?.items ?? [], [activeDay]);
  const dateLabel = activeDay?.label ?? "Program";

  return (
    <section className="rounded-[26px] border border-abj-goldDim bg-abj-panel px-5 py-4 shadow-[0_12px_28px_rgba(17,17,17,0.06)]">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-abj-text2">Timeline</p>
        <p className="text-sm font-semibold text-abj-text1">{dateLabel}</p>
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
                  : "border-[rgba(17,17,17,0.2)] bg-white text-abj-text2 hover:text-abj-text1"
              }`}
            >
              {day.label}
            </button>
          );
        })}
      </div>

      <div className="abj-dot-grid -mx-1 overflow-x-auto rounded-2xl border border-[rgba(17,17,17,0.11)] bg-white p-3">
        <div className="flex min-w-max gap-3">
          {items.length === 0 ? (
            <p className="px-2 py-4 text-sm text-abj-text2">Program se připravuje.</p>
          ) : (
            items.map((item, idx) => {
              const key = `${item.videoId ?? "item"}-${item.time}-${idx}`;
              const active = selectedKey === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setSelectedKey(key);
                    onSelect(item);
                  }}
                  className={`group flex min-h-[130px] w-[154px] flex-col justify-between rounded-[24px] border p-4 text-left transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-abj-red/40 ${itemTone(
                    item,
                    active
                  )}`}
                >
                  <span className="text-[11px] font-bold tracking-[0.08em]">{item.time}</span>
                  <div>
                    <p className="line-clamp-2 text-sm font-semibold leading-tight text-current">{item.title}</p>
                    <p className={`mt-1 text-[11px] ${active ? "text-white/80" : "text-abj-text3"}`}>
                      {typeLabel(item)}
                    </p>
                  </div>
                  <span
                    className={`h-4 w-4 rounded-full border transition ${
                      active
                        ? "border-white bg-white"
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

"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { DayProgram, ProgramItem } from "@/lib/epg-types";

export type TimelineBlockType = "abj" | "live" | "premiere" | "recorded" | "coming_up";

export type TimelineProgramBlock = {
  id: string;
  title: string;
  channel: string;
  startHour: number;
  startMin: number;
  durationMin: number;
  type: TimelineBlockType;
  isABJ: boolean;
  videoId: string | null;
};

type TimelineProps = {
  days: DayProgram[];
  onSelect: (item: ProgramItem) => void;
};

const PPM = 4;
const SHOW_START = 14;
const SHOW_END = 24;
const TOTAL_WIDTH = (SHOW_END - SHOW_START) * 60 * PPM;

function pragueNow(): { hour: number; minute: number } {
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

  return {
    hour: Number(map.hour ?? 0),
    minute: Number(map.minute ?? 0),
  };
}

function nowX(): number {
  const now = pragueNow();
  return ((now.hour - SHOW_START) * 60 + now.minute) * PPM;
}

function toTimelineBlock(item: ProgramItem, idx: number): TimelineProgramBlock {
  const [h, m] = item.time.split(":");
  const hour = Number(h ?? "0");
  const minute = Number(m ?? "0");
  const isABJ = item.isABJ || item.channelName.toLowerCase().includes("abj");
  const type: TimelineBlockType =
    item.type === "live"
      ? "live"
      : item.type === "upcoming"
        ? "premiere"
        : isABJ
          ? "abj"
          : "recorded";

  return {
    id: `${item.videoId ?? "block"}-${item.time}-${idx}`,
    title: item.title,
    channel: item.channelName,
    startHour: hour,
    startMin: minute,
    durationMin: type === "live" ? 75 : type === "abj" ? 30 : type === "premiere" ? 30 : 25,
    type,
    isABJ,
    videoId: item.videoId,
  };
}

function addComingUpBlocks(blocks: TimelineProgramBlock[]): TimelineProgramBlock[] {
  const sorted = [...blocks].sort(
    (a, b) => a.startHour * 60 + a.startMin - (b.startHour * 60 + b.startMin)
  );

  const fixedSlots = [
    { startHour: 17, startMin: 0 },
    { startHour: 19, startMin: 0 },
    { startHour: 20, startMin: 0 },
  ];

  const withComingUp = [...sorted];
  for (const slot of fixedSlots) {
    const slotExists = sorted.some(
      (block) => block.startHour === slot.startHour && block.startMin === slot.startMin
    );
    if (!slotExists) continue;

    const comingUpStartMin = slot.startMin - 15;
    const startTotalMin = slot.startHour * 60 + comingUpStartMin;
    const overlaps = sorted.some((block) => {
      const blockStart = block.startHour * 60 + block.startMin;
      const blockEnd = blockStart + block.durationMin;
      return startTotalMin < blockEnd && startTotalMin + 15 > blockStart;
    });
    if (overlaps) continue;

    withComingUp.push({
      id: `coming-up-${slot.startHour}-${slot.startMin}`,
      title: "Za chvíli začínáme",
      channel: "ABJ TV",
      startHour: slot.startHour,
      startMin: comingUpStartMin,
      durationMin: 15,
      type: "coming_up",
      isABJ: true,
      videoId: null,
    });
  }

  return withComingUp.sort(
    (a, b) => a.startHour * 60 + a.startMin - (b.startHour * 60 + b.startMin)
  );
}

function blockClass(block: TimelineProgramBlock, selected: boolean): string {
  const selectedClass = selected ? "outline outline-[1.5px] outline-[rgba(198,168,91,0.55)]" : "";
  if (block.type === "abj") return `bg-abj-gold text-[#08152A] ${selectedClass}`;
  if (block.type === "live")
    return `bg-[#190909] text-abj-text1 border-l-2 border-abj-red rounded-r-[3px] ${selectedClass}`;
  if (block.type === "premiere")
    return `bg-[#0A1C32] text-abj-text1 border-l-2 border-[#2A5490] rounded-r-[3px] ${selectedClass}`;
  if (block.type === "coming_up")
    return `bg-[rgba(12,32,55,0.40)] text-[#4E5F72] border border-dashed border-[rgba(78,95,114,0.30)] ${selectedClass}`;
  return `bg-[#0C1B2C] text-abj-text2 ${selectedClass}`;
}

function itemFromBlock(block: TimelineProgramBlock): ProgramItem {
  const hh = String(block.startHour).padStart(2, "0");
  const mm = String(block.startMin).padStart(2, "0");
  return {
    time: `${hh}:${mm}`,
    title: block.title,
    channelName: block.channel,
    thumbnail: null,
    videoId: block.videoId,
    isABJ: block.isABJ,
    type: block.type === "live" ? "live" : block.type === "premiere" ? "upcoming" : "vod",
  };
}

export type ProgramMoment = {
  title: string;
  start: string;
  end: string;
};

function toIsoFromPragueTime(hour: number, minute: number): string {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("cs-CZ", {
    timeZone: "Europe/Prague",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(now)
    .reduce<Record<string, string>>((acc, part) => {
      if (part.type !== "literal") acc[part.type] = part.value;
      return acc;
    }, {});

  const yyyy = Number(parts.year);
  const mm = Number(parts.month);
  const dd = Number(parts.day);
  const utc = new Date(Date.UTC(yyyy, mm - 1, dd, hour, minute, 0));
  return utc.toISOString();
}

export function Timeline({ days, onSelect }: TimelineProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [activeDayIndex, setActiveDayIndex] = useState(0);

  const activeDay = days[activeDayIndex] ?? days[0];
  const blocks = useMemo(() => {
    const mapped = (activeDay?.items ?? []).map(toTimelineBlock);
    const withFixed = [...mapped];

    const has17 = withFixed.some((b) => b.startHour === 17 && b.startMin === 0);
    if (!has17) {
      withFixed.push({
        id: "fixed-17",
        title: "Reportáž ABJ",
        channel: "ABJ TV",
        startHour: 17,
        startMin: 0,
        durationMin: 30,
        type: "abj",
        isABJ: true,
        videoId: null,
      });
    }

    const has19 = withFixed.some((b) => b.startHour === 19 && b.startMin === 0);
    if (!has19) {
      withFixed.push({
        id: "fixed-19",
        title: "Jasné zprávy",
        channel: "ABJ TV",
        startHour: 19,
        startMin: 0,
        durationMin: 25,
        type: "abj",
        isABJ: true,
        videoId: null,
      });
    }

    const has20 = withFixed.some((b) => b.startHour === 20 && b.startMin === 0);
    if (!has20) {
      withFixed.push({
        id: "fixed-20",
        title: "Živě ABJ — Večerní studio",
        channel: "ABJ TV",
        startHour: 20,
        startMin: 0,
        durationMin: 75,
        type: "live",
        isABJ: true,
        videoId: null,
      });
    }

    return addComingUpBlocks(withFixed);
  }, [activeDay]);

  const nowNext = useMemo(() => {
    const currentTotal = pragueNow().hour * 60 + pragueNow().minute;
    const sorted = [...blocks].sort(
      (a, b) => a.startHour * 60 + a.startMin - (b.startHour * 60 + b.startMin)
    );
    let nowBlock: TimelineProgramBlock | null = null;
    let nextBlock: TimelineProgramBlock | null = null;

    for (const block of sorted) {
      const start = block.startHour * 60 + block.startMin;
      const end = start + block.durationMin;
      if (start <= currentTotal && currentTotal < end) {
        nowBlock = block;
      }
      if (start > currentTotal && nextBlock === null) {
        nextBlock = block;
      }
    }

    const toMoment = (block: TimelineProgramBlock | null): ProgramMoment | null => {
      if (!block) return null;
      const start = toIsoFromPragueTime(block.startHour, block.startMin);
      const endMinutes = block.startHour * 60 + block.startMin + block.durationMin;
      const endHour = Math.floor(endMinutes / 60);
      const endMin = endMinutes % 60;
      const end = toIsoFromPragueTime(endHour, endMin);
      return {
        title: block.title,
        start,
        end,
      };
    };

    return {
      nowItem: toMoment(nowBlock),
      nextItem: toMoment(nextBlock),
    };
  }, [blocks]);

  useEffect(() => {
    if (!scrollRef.current) return;
    const x = nowX();
    scrollRef.current.scrollLeft = Math.max(0, x - 110);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setTick((v) => v + 1), 30_000);
    return () => clearInterval(timer);
  }, []);

  const currentX = nowX();
  const dateLabel =
    activeDay?.label ??
    new Intl.DateTimeFormat("cs-CZ", {
      timeZone: "Europe/Prague",
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(new Date());

  return (
    <section className="flex-1 bg-abj-deep pb-3">
      <div className="flex items-center justify-between px-5 pb-2 pt-[11px]">
        <p className="text-[9px] font-medium uppercase tracking-[0.2em] text-abj-gold">Program</p>
        <p className="text-[11px] text-abj-text2">{dateLabel}</p>
      </div>

      <div className="overflow-x-auto px-5" ref={scrollRef}>
        <div className="relative" style={{ width: `${TOTAL_WIDTH}px` }}>
          <div className="relative h-5">
            {Array.from({ length: SHOW_END - SHOW_START + 1 }, (_, idx) => {
              const h = SHOW_START + idx;
              const left = (h - SHOW_START) * 60 * PPM;
              return (
                <span
                  key={`tick-${h}`}
                  className="absolute -translate-x-1/2 text-[10px] text-abj-text3"
                  style={{ left: `${left}px`, top: "0px" }}
                >
                  {String(h).padStart(2, "0")}:00
                </span>
              );
            })}
          </div>

          <div className="relative mt-[3px] h-[50px]">
            {blocks.map((block) => {
              const minutesFromStart =
                block.startHour * 60 + block.startMin - SHOW_START * 60;
              const left = minutesFromStart * PPM;
              const width = Math.max(14, block.durationMin * PPM);
              const selected = selectedId === block.id;
              const clickable = Boolean(block.videoId);

              return (
                <button
                  key={block.id}
                  type="button"
                  className={`absolute top-0 h-full overflow-hidden rounded-[3px] px-2 py-[5px] text-left transition-[filter] duration-150 hover:brightness-110 ${
                    blockClass(block, selected)
                  } ${clickable ? "cursor-pointer" : "cursor-default"}`}
                  style={{ left: `${left}px`, width: `${width}px` }}
                  onClick={() => {
                    setSelectedId(block.id);
                    onSelect(itemFromBlock(block));
                  }}
                >
                  {width > 40 ? (
                    <>
                      <span
                        className={`mb-[2px] block text-[8px] uppercase tracking-[0.09em] ${
                          block.type === "abj" ? "opacity-45" : "opacity-55"
                        }`}
                      >
                        {block.type.replace("_", " ")}
                      </span>
                      <span className="block truncate text-[11px] font-medium">{block.title}</span>
                    </>
                  ) : null}
                </button>
              );
            })}

            <span
              key={tick}
              className="pointer-events-none absolute z-10 w-px bg-abj-red opacity-65"
              style={{
                left: `${currentX}px`,
                top: "-20px",
                bottom: "0px",
              }}
            >
              <span className="absolute -top-1 left-1/2 h-[7px] w-[7px] -translate-x-1/2 rounded-full bg-abj-red" />
            </span>
          </div>
        </div>
      </div>

      <div className="px-5 pt-2">
        <div className="inline-flex gap-2">
          {days.map((day, idx) => {
            const active = idx === activeDayIndex;
            return (
              <button
                key={day.date}
                type="button"
                onClick={() => setActiveDayIndex(idx)}
                className={`rounded-sm px-2 py-1 text-[10px] uppercase tracking-[0.12em] ${
                  active ? "bg-abj-panel text-abj-gold" : "text-abj-text2"
                }`}
              >
                {day.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="hidden" data-now-item={JSON.stringify(nowNext.nowItem)} data-next-item={JSON.stringify(nowNext.nextItem)} />
    </section>
  );
}

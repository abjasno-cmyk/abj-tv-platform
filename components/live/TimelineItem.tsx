"use client";

import type { ProgramItem } from "@/lib/epg-types";

type TimelineItemProps = {
  item: ProgramItem;
  isNow: boolean;
  widthPx: number;
  onClick: () => void;
};

function getTone(isNow: boolean, type: ProgramItem["type"]): string {
  if (isNow) return "bg-yellow-500 text-[#1C1202] scale-[1.02]";
  if (type === "live") return "bg-red-500/20 text-red-100";
  if (type === "upcoming") return "bg-sky-500/20 text-sky-100";
  return "bg-gray-700 text-gray-100";
}

export function TimelineItem({ item, isNow, widthPx, onClick }: TimelineItemProps) {
  const tone = getTone(isNow, item.type);
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-full rounded-md px-3 py-2 text-left transition-all hover:scale-[1.02] ${tone}`}
      style={{ width: `${widthPx}px`, minWidth: `${Math.max(120, widthPx)}px` }}
    >
      <p className="text-[10px] uppercase tracking-[0.08em] opacity-80">{item.time}</p>
      <p className="mt-1 line-clamp-2 text-sm font-semibold">{item.title}</p>
      <p className="mt-1 truncate text-[11px] opacity-85">{item.channelName}</p>
    </button>
  );
}

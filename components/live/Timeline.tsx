"use client";

import { useMemo, useState } from "react";

import type { TimelineSegment } from "@/components/live/LiveState";

type TimelineProps = {
  items: TimelineSegment[];
  onJump: (segment: TimelineSegment) => void;
};

export function Timeline({ items, onJump }: TimelineProps) {
  const [previewId, setPreviewId] = useState<string | null>(null);

  const ordered = useMemo(() => items.slice(0, 12), [items]);

  return (
    <section className="rounded-2xl border border-[#244A73] bg-[linear-gradient(180deg,#0A1A2D,#071321)] p-4 shadow-[0_16px_36px_rgba(0,0,0,0.35)]">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-[0.16em] text-[#9CC9FF]">Timeline</p>
        <p className="text-[11px] font-medium text-[#D4E5FF]">NOW / NEXT / LATER</p>
      </div>

      <div className="overflow-x-auto">
        <div className="flex min-w-max gap-3">
          {ordered.map((segment, idx) => {
            const bucket = segment.phase.toUpperCase();
            const selected = segment.phase === "now";
            const preview = previewId === segment.id;
            return (
              <button
                key={segment.id}
                type="button"
                onClick={() => onJump(segment)}
                onMouseEnter={() => setPreviewId(segment.id)}
                onMouseLeave={() => setPreviewId(null)}
                onTouchStart={() => setPreviewId(segment.id)}
                className={`w-[230px] shrink-0 rounded-xl border p-3 text-left transition-all duration-150 active:scale-[0.98] ${
                  selected
                    ? "border-[rgba(245,78,78,0.55)] bg-[linear-gradient(180deg,#1E3557,#10233D)] shadow-[0_10px_26px_rgba(0,0,0,0.45)]"
                    : "border-[#305780] bg-[#0C2038] hover:border-[#4A78A8]"
                }`}
              >
                <p className="text-[10px] uppercase tracking-[0.15em] text-[#8EBEFF]">{bucket}</p>
                <p className="mt-1 line-clamp-2 text-[15px] font-semibold text-[#F2F7FF]">{segment.title}</p>
                <p className="mt-2 text-[12px] text-[#B3CAE7]">
                  {segment.duration} • {segment.start_time}
                </p>
                {preview ? (
                  <p className="mt-2 text-[12px] text-[#D8E7FA]">
                    {segment.explanation?.trim().length
                      ? segment.explanation
                      : "Pokračování živého vysílání."}
                  </p>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

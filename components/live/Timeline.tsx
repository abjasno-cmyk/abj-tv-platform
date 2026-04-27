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
    <section className="rounded-xl border border-[#1E3550] bg-[#091425] p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-[0.16em] text-abj-gold">Live timeline</p>
        <p className="text-[11px] text-abj-text3">NOW / NEXT / LATER</p>
      </div>

      <div className="overflow-x-auto">
        <div className="flex min-w-max gap-2">
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
                className={`w-[210px] shrink-0 rounded-lg border p-3 text-left transition-all duration-150 active:scale-[0.98] ${
                  selected
                    ? "border-[rgba(198,168,91,0.6)] bg-[linear-gradient(180deg,#112742,#0A1729)] shadow-[0_6px_18px_rgba(0,0,0,0.4)]"
                    : "border-[#203A57] bg-[#0B192D] hover:border-[#2A4C70]"
                }`}
              >
                <p className="text-[9px] uppercase tracking-[0.14em] text-abj-gold">{bucket}</p>
                <p className="mt-1 line-clamp-2 text-[14px] font-medium text-abj-text1">{segment.title}</p>
                <p className="mt-2 text-[11px] text-abj-text2">
                  {segment.duration} • {segment.start_time}
                </p>
                {preview ? (
                  <p className="mt-2 text-[11px] text-[#AFC3D8]">
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

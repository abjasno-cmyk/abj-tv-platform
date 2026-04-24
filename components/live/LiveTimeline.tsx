"use client";

import { useMemo } from "react";

import type { ProgramItem } from "@/lib/epg-types";
import { TimelineItem } from "@/components/live/TimelineItem";

type LiveTimelineProps = {
  items: ProgramItem[];
  currentVideoId: string | null;
  onSeekToItem: (item: ProgramItem) => void;
};

function parseMinutes(time: string): number {
  const [h, m] = time.split(":").map((part) => Number(part));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 30;
  return h * 60 + m;
}

function estimateDuration(items: ProgramItem[], index: number): number {
  const current = items[index];
  if (!current) return 30;
  const currentStart = parseMinutes(current.time);
  const next = items[index + 1];
  if (!next) return 30;
  const nextStart = parseMinutes(next.time);
  const delta = nextStart - currentStart;
  if (!Number.isFinite(delta) || delta <= 0) return 30;
  return delta;
}

export function LiveTimeline({ items, currentVideoId, onSeekToItem }: LiveTimelineProps) {
  const timeline = useMemo(
    () =>
      items.map((item, index) => ({
        item,
        widthPx: Math.max(120, estimateDuration(items, index) * 6),
      })),
    [items]
  );

  if (timeline.length === 0) {
    return (
      <section className="rounded-xl border border-[var(--abj-gold-dim)] bg-[var(--card)] p-4">
        <p className="text-sm text-abj-text2">Programová timeline se připravuje.</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-[var(--abj-gold-dim)] bg-[var(--card)] p-3">
      <p className="mb-2 text-[11px] uppercase tracking-[0.1em] text-abj-text2">Timeline vysílání</p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {timeline.map(({ item, widthPx }) => (
          <TimelineItem
            key={`${item.videoId ?? item.time}-${item.title}`}
            item={item}
            widthPx={widthPx}
            isNow={Boolean(currentVideoId && item.videoId === currentVideoId)}
            onClick={() => onSeekToItem(item)}
          />
        ))}
      </div>
    </section>
  );
}

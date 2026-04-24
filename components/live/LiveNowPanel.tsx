"use client";

import { useEffect, useMemo, useState } from "react";

import type { ProgramItem } from "@/lib/epg-types";

type LiveNowPanelProps = {
  items: ProgramItem[];
  currentVideoId: string | null;
  onPlayPrevious: (item: ProgramItem) => void;
};

function parseTimeToTimestamp(time: string): number {
  const [h, m] = time.split(":").map((part) => Number(part));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return Number.NaN;
  const base = new Date();
  base.setHours(h, m, 0, 0);
  return base.getTime();
}

function computeCurrentIndex(items: ProgramItem[], currentVideoId: string | null): number {
  if (currentVideoId) {
    const idx = items.findIndex((item) => item.videoId === currentVideoId);
    if (idx >= 0) return idx;
  }
  if (items.length === 0) return -1;

  const nowTs = Date.now();
  const indexed = items.map((item, index) => ({
    index,
    ts: parseTimeToTimestamp(item.time),
  }));
  const current = indexed.find((entry, idx) => {
    const nextTs = indexed[idx + 1]?.ts ?? Number.POSITIVE_INFINITY;
    return Number.isFinite(entry.ts) && entry.ts <= nowTs && nowTs < nextTs;
  });
  if (current) return current.index;
  return 0;
}

function formatCountdown(ms: number): string {
  const clamped = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function LiveNowPanel({ items, currentVideoId, onPlayPrevious }: LiveNowPanelProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const { nowItem, nextItem, previousItem } = useMemo(() => {
    const idx = computeCurrentIndex(items, currentVideoId);
    return {
      nowItem: idx >= 0 ? items[idx] : null,
      nextItem: idx >= 0 ? items[idx + 1] ?? null : null,
      previousItem: idx > 0 ? items[idx - 1] : null,
    };
  }, [items, currentVideoId]);

  const countdown = useMemo(() => {
    if (!nextItem) return null;
    const nextTs = parseTimeToTimestamp(nextItem.time);
    if (!Number.isFinite(nextTs)) return null;
    return formatCountdown(nextTs - now);
  }, [nextItem, now]);

  return (
    <aside className="rounded-xl border border-[var(--abj-gold-dim)] bg-[var(--card)] p-4">
      <h2 className="text-sm font-semibold uppercase tracking-[0.09em] text-abj-text2">Live panel</h2>

      <div className="mt-4 space-y-4">
        <section>
          <p className="text-[11px] uppercase tracking-[0.08em] text-abj-text2">Teď běží</p>
          <p className="mt-1 text-base font-semibold text-abj-text1">{nowItem?.title ?? "Čekáme na program"}</p>
          <p className="text-xs text-abj-text2">{nowItem ? `${nowItem.time} · ${nowItem.channelName}` : "—"}</p>
        </section>

        <section>
          <p className="text-[11px] uppercase tracking-[0.08em] text-abj-text2">Za chvíli</p>
          <p className="mt-1 text-sm font-medium text-abj-text1">{nextItem?.title ?? "Další pořad se připravuje"}</p>
          <p className="text-xs text-abj-text2">
            {nextItem ? `${nextItem.time} · countdown ${countdown ?? "00:00"}` : "—"}
          </p>
        </section>

        <section>
          <p className="text-[11px] uppercase tracking-[0.08em] text-abj-text2">Před chvílí</p>
          {previousItem ? (
            <button
              type="button"
              onClick={() => onPlayPrevious(previousItem)}
              className="mt-1 w-full rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-left text-sm text-abj-text1 transition hover:bg-white/[0.06]"
            >
              <p className="font-medium">{previousItem.title}</p>
              <p className="text-xs text-abj-text2">{previousItem.time}</p>
            </button>
          ) : (
            <p className="mt-1 text-xs text-abj-text2">Není k dispozici.</p>
          )}
        </section>
      </div>
    </aside>
  );
}

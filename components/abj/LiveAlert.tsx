"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

type LiveNowItem = {
  video_id: string;
  title: string;
  channel: string;
  thumbnail?: string | null;
};

type LiveNowResponse = {
  is_live: boolean;
  items?: LiveNowItem[];
};

type LiveAlertProps = {
  currentVideoId: string | null;
  onWatchLive: (videoId: string) => void;
};

const DISMISSED_STORAGE_KEY = "abj.live-alert.dismissed-video-ids";
const POLL_INTERVAL_MS = 60_000;

function readDismissedIds(): Set<string> {
  try {
    const raw = window.localStorage.getItem(DISMISSED_STORAGE_KEY);
    if (!raw) return new Set<string>();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set<string>();
    return new Set(parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0));
  } catch {
    return new Set<string>();
  }
}

function writeDismissedIds(ids: Set<string>): void {
  try {
    window.localStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // Silently ignore storage write failures.
  }
}

export function LiveAlert({ currentVideoId, onWatchLive }: LiveAlertProps) {
  const [activeItem, setActiveItem] = useState<LiveNowItem | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => readDismissedIds());

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch("/live-now", { cache: "no-store" });
        if (!response.ok) {
          if (!cancelled) setActiveItem(null);
          return;
        }
        const payload = (await response.json()) as LiveNowResponse;
        if (!payload.is_live || !Array.isArray(payload.items) || payload.items.length === 0) {
          if (!cancelled) setActiveItem(null);
          return;
        }

        const firstAvailable = payload.items.find((item) => {
          if (!item?.video_id) return false;
          if (dismissedIds.has(item.video_id)) return false;
          if (currentVideoId && currentVideoId === item.video_id) return false;
          return true;
        });

        if (!cancelled) {
          setActiveItem(firstAvailable ?? null);
        }
      } catch {
        if (!cancelled) setActiveItem(null);
      }
    };

    void load();
    const timer = setInterval(() => {
      void load();
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [currentVideoId, dismissedIds]);

  const visible = useMemo(() => {
    if (!activeItem) return false;
    if (!activeItem.video_id) return false;
    if (currentVideoId && currentVideoId === activeItem.video_id) return false;
    if (dismissedIds.has(activeItem.video_id)) return false;
    return true;
  }, [activeItem, currentVideoId, dismissedIds]);

  if (!visible || !activeItem) return null;

  return (
    <aside className="fixed bottom-4 right-4 z-[80] w-[min(320px,calc(100vw-24px))] rounded-xl border border-[var(--abj-gold-dim)] bg-[rgba(4,10,18,0.96)] p-3 shadow-[0_10px_24px_rgba(0,0,0,0.45)]">
      <button
        type="button"
        aria-label="Zavřít upozornění"
        className="absolute right-2 top-2 rounded px-1 text-abj-text2 transition-colors hover:text-abj-text1"
        onClick={() => {
          const next = new Set(dismissedIds);
          next.add(activeItem.video_id);
          setDismissedIds(next);
          writeDismissedIds(next);
          setActiveItem(null);
        }}
      >
        ×
      </button>

      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#E18282]">🔴 PRÁVĚ ŽIVĚ</p>

      <div className="flex gap-3">
        {activeItem.thumbnail ? (
          <div className="relative h-[68px] w-[120px] shrink-0 overflow-hidden rounded bg-[#0a1e35]">
            <Image
              src={activeItem.thumbnail}
              alt={activeItem.title}
              fill
              sizes="120px"
              className="object-cover"
              loading="lazy"
              unoptimized
            />
          </div>
        ) : null}

        <div className="min-w-0 space-y-1">
          <p className="truncate text-xs text-abj-text2">{activeItem.channel}</p>
          <p className="line-clamp-2 text-sm font-medium text-abj-text1">{activeItem.title}</p>
        </div>
      </div>

      <button
        type="button"
        className="mt-3 w-full rounded border border-[rgba(198,168,91,0.35)] bg-[rgba(198,168,91,0.12)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-abj-gold transition-colors hover:bg-[rgba(198,168,91,0.2)]"
        onClick={() => {
          onWatchLive(activeItem.video_id);
        }}
      >
        SLEDOVAT ŽIVĚ
      </button>
    </aside>
  );
}

"use client";

import { useEffect } from "react";

import type { RecommendedVideo } from "@/lib/liveRuntime";

type RecommendedStripProps = {
  items: RecommendedVideo[];
  onSelect: (video: RecommendedVideo) => void;
};

function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const mm = Math.floor(safe / 60);
  const ss = safe % 60;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

export function RecommendedStrip({ items, onSelect }: RecommendedStripProps) {
  useEffect(() => {
    if (items.length !== 3) return;
    items.forEach((item) => {
      if (!item.thumbnail) return;
      const image = new Image();
      image.src = item.thumbnail;
    });
  }, [items]);

  if (items.length !== 3) {
    return null;
  }

  return (
    <section className="w-full shrink-0 rounded-2xl border border-[#274268] bg-[linear-gradient(180deg,#071426,#0A1A2E)] p-3 shadow-[0_14px_28px_rgba(0,0,0,0.32)]">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-[#CFE3FF]">
          Mohlo by vás zajímat
        </h3>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="flex gap-3">
          {items.map((video) => (
            <button
              key={video.id}
              type="button"
              onClick={() => onSelect(video)}
              className="flex min-h-[132px] w-[82%] shrink-0 flex-col overflow-hidden rounded-xl border border-[#315A86] bg-[#0B213B] text-left transition hover:border-[#4D85BC] hover:bg-[#0F2A47] active:scale-[0.99] sm:w-[48%] lg:w-[31%]"
            >
              <div className="relative w-full overflow-hidden bg-black" style={{ aspectRatio: "16 / 9" }}>
                {video.thumbnail ? (
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-abj-text2">
                    Náhled není dostupný
                  </div>
                )}
                <span className="absolute bottom-2 right-2 rounded bg-black/70 px-2 py-1 text-[11px] font-semibold text-white">
                  {formatDuration(video.durationSec)}
                </span>
              </div>
              <div className="flex min-h-[88px] flex-1 flex-col px-3 py-2">
                <p className="line-clamp-2 text-sm font-semibold leading-snug text-[#F2F7FF]">{video.title}</p>
                <p className="mt-1 line-clamp-1 text-xs text-[#A5BFDA]">{video.reason}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

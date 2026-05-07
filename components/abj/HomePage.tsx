"use client";

import { useMemo } from "react";

import { LivePlayer } from "@/components/abj/LivePlayer";
import { RecommendedStrip } from "@/components/abj/RecommendedStrip";
import { Timeline } from "@/components/abj/Timeline";
import type { DayProgram, ProgramItem } from "@/lib/epg-types";

type HomePageProps = {
  days: DayProgram[];
  videoId: string | null;
  title: string;
  channelName: string;
  isLive: boolean;
  startSeconds?: number;
  remainingLabel: string;
  progressPercent: number;
  isFiller: boolean;
  onSelect: (item: ProgramItem) => void;
  onPlayToggle?: () => void;
};

function fallbackThumb(videoId: string | null): string | null {
  if (!videoId) return null;
  return `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`;
}

export function HomePage({
  days,
  videoId,
  title,
  channelName,
  isLive,
  startSeconds = 0,
  remainingLabel,
  progressPercent,
  isFiller,
  onSelect,
  onPlayToggle,
}: HomePageProps) {
  const recommendedItems = useMemo(() => {
    const pool = days.flatMap((day) => day.items);
    return pool
      .filter((item) => item.videoId && item.videoId !== videoId)
      .slice(0, 3)
      .map((item, idx) => ({
        id: item.videoId ?? `recommended-${idx}`,
        title: item.title,
        reason:
          item.type === "live"
            ? "Právě živé vysílání"
            : item.type === "upcoming"
              ? "Navazuje v programu"
              : "Vybráno z aktuálního výběru",
        image: item.thumbnail ?? fallbackThumb(item.videoId),
        fallbackImage: "/placeholder-thumb.jpg",
      }));
  }, [days, videoId]);

  return (
    <section className="relative min-h-[calc(100vh-46px)] overflow-hidden bg-abj-main pb-10 pt-5 text-abj-text1">
      <div
        aria-hidden="true"
        className="abj-dot-grid pointer-events-none absolute inset-x-0 top-0 h-[45vh] opacity-[0.2]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-20 top-[20vh] h-56 w-56 rounded-full bg-[var(--abj-red-dim)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-[-110px] top-[62vh] h-72 w-72 rounded-full border border-[var(--abj-gold-dim)]"
      />

      <div className="relative z-[2] mx-auto flex w-full max-w-[1200px] flex-col gap-10 px-4 sm:px-6 lg:px-10">
        <LivePlayer
          videoId={videoId}
          title={title}
          channel={channelName || "ABJ Síť"}
          isLive={isLive}
          startSeconds={startSeconds}
          remainingLabel={remainingLabel}
          progressPercent={progressPercent}
          isFiller={isFiller}
          onPlayToggle={onPlayToggle}
        />

        <Timeline days={days} onSelect={onSelect} />

        <RecommendedStrip
          items={recommendedItems}
          onSelect={(id) => {
            const selected = days
              .flatMap((day) => day.items)
              .find((item) => item.videoId && item.videoId === id);
            if (selected) onSelect(selected);
          }}
        />
      </div>
    </section>
  );
}

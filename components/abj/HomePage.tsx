"use client";

import type { ReactNode } from "react";

import { ChannelDirectory, type LiveChannelGroup, type LiveChannelVideo } from "@/components/abj/ChannelDirectory";
import { LivePlayer } from "@/components/abj/LivePlayer";
import { Timeline } from "@/components/abj/Timeline";
import type { DayProgram, ProgramItem } from "@/lib/epg-types";

type HomePageProps = {
  days: DayProgram[];
  channels: LiveChannelGroup[];
  videoId: string | null;
  title: string;
  channelName: string;
  isLive: boolean;
  startSeconds?: number;
  remainingLabel: string;
  progressPercent: number;
  isFiller: boolean;
  onSelect: (item: ProgramItem) => void;
  onReturnToLive: () => void;
  onSelectChannelVideo: (payload: { channelName: string; video: LiveChannelVideo }) => void;
  reactionsSlot?: ReactNode;
};

export function HomePage({
  days,
  channels,
  videoId,
  title,
  channelName,
  isLive,
  startSeconds = 0,
  remainingLabel,
  progressPercent,
  isFiller,
  onSelect,
  onReturnToLive,
  onSelectChannelVideo,
  reactionsSlot,
}: HomePageProps) {
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
          onGoLive={onReturnToLive}
        />

        <Timeline days={days} onSelect={onSelect} />

        {reactionsSlot}

        <ChannelDirectory channels={channels} onSelectVideo={onSelectChannelVideo} />
      </div>
    </section>
  );
}

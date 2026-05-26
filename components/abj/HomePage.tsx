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
  continueFromSeconds?: number | null;
  onSelect: (item: ProgramItem) => void;
  onReturnToLive: () => void;
  onContinueFromSaved?: (seconds: number) => void;
  onPlaybackSample?: (sample: { videoId: string; positionSeconds: number; durationSeconds: number }) => void;
  onSelectChannelVideo: (payload: { channelName: string; video: LiveChannelVideo }) => void;
  engagementSlot?: ReactNode;
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
  continueFromSeconds = null,
  onSelect,
  onReturnToLive,
  onContinueFromSaved,
  onPlaybackSample,
  onSelectChannelVideo,
  engagementSlot,
  reactionsSlot,
}: HomePageProps) {
  return (
    <section className="relative min-h-[calc(100vh-46px)] overflow-hidden bg-[#F6F3EE] pb-10 pt-5 text-abj-text1">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[250px] bg-[radial-gradient(circle_at_top,rgba(237,116,47,0.13)_0%,rgba(246,243,238,0)_72%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-20 top-[16vh] h-64 w-64 rounded-full bg-[rgba(237,116,47,0.08)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-[-120px] top-[54vh] h-80 w-80 rounded-full border border-[rgba(237,116,47,0.18)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-6 hidden -translate-x-1/2 select-none font-[var(--font-serif)] text-[clamp(70px,17vw,210px)] font-black uppercase leading-none text-black/[0.035] md:block"
      >
        VEROX
      </div>

      <div className="relative z-[2] mx-auto flex w-full max-w-[1320px] flex-col gap-6 px-4 sm:px-6 lg:px-10">
        <div id="live-player-section" className="order-1">
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
            continueFromSeconds={continueFromSeconds}
            onContinueFromSaved={onContinueFromSaved}
            onPlaybackSample={onPlaybackSample}
          />
        </div>

        <div id="live-timeline-section" className="order-2">
          <Timeline days={days} onSelect={onSelect} />
        </div>

        <div id="live-channels-section" className="order-3">
          <ChannelDirectory channels={channels} onSelectVideo={onSelectChannelVideo} />
        </div>

        <div className="order-4 grid gap-6 xl:grid-cols-2">
          <div id="live-reactions-section">{reactionsSlot}</div>
          <div id="live-engagement-section">{engagementSlot}</div>
        </div>
      </div>
    </section>
  );
}

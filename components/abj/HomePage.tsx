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
  const hasReactions = Boolean(reactionsSlot);
  const hasEngagement = Boolean(engagementSlot);

  return (
    <section className="relative min-h-[calc(100vh-46px)] bg-white pb-10 pt-5 text-abj-text1">
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

        {hasReactions || hasEngagement ? (
          <div className={`order-4 grid gap-6 ${hasReactions && hasEngagement ? "xl:grid-cols-2" : ""}`}>
            {hasReactions ? <div id="live-reactions-section">{reactionsSlot}</div> : null}
            {hasEngagement ? <div id="live-engagement-section">{engagementSlot}</div> : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

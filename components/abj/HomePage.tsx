"use client";

import type { ReactNode } from "react";

import { ChannelDirectory, type LiveChannelGroup, type LiveChannelVideo } from "@/components/abj/ChannelDirectory";
import { LiveCommunityStrip } from "@/components/abj/LiveCommunityStrip";
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
    <section className="verox-live-page relative min-h-[calc(100vh-46px)] bg-[#FFFFFF] pb-10 pt-20 font-[Helvetica,Arial,sans-serif] text-[#111111] max-[480px]:pb-6 max-[480px]:pt-3 sm:pt-24">
      <div className="relative z-[2] mx-auto flex w-full max-w-[1320px] flex-col gap-6 px-4 sm:px-6 max-[480px]:gap-4 max-[480px]:px-0 lg:px-10">
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
            communitySlot={<LiveCommunityStrip />}
          />
        </div>

        {hasReactions || hasEngagement ? (
          <div
            className={`verox-live-desktop-only order-2 grid gap-6 ${hasReactions && hasEngagement ? "xl:grid-cols-2" : ""}`}
          >
            {hasReactions ? <div id="live-reactions-section">{reactionsSlot}</div> : null}
            {hasEngagement ? <div id="live-engagement-section">{engagementSlot}</div> : null}
          </div>
        ) : null}

        <div id="live-timeline-section" className="order-3">
          <Timeline days={days} onSelect={onSelect} />
        </div>

        <div id="live-channels-section" className="order-4">
          <ChannelDirectory channels={channels} onSelectVideo={onSelectChannelVideo} />
        </div>
      </div>
    </section>
  );
}

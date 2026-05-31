"use client";

import type { ReactNode } from "react";

import { ChannelDirectory, type LiveChannelGroup, type LiveChannelVideo } from "@/components/abj/ChannelDirectory";
import { LivePlayer } from "@/components/abj/LivePlayer";
import { Timeline } from "@/components/abj/Timeline";
import { HomeTicker } from "@/components/abj/HomeTicker";
import { HomeNewsRail } from "@/components/abj/HomeNewsRail";
import { HomeVideoRail } from "@/components/abj/HomeVideoRail";
import { HomeKomunita } from "@/components/abj/HomeKomunita";
import type { HomeNewsItem, HomeVideoItem, HomeWallPost } from "@/lib/home-sections";
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
  tickerItems?: string[];
  news?: HomeNewsItem[];
  videos?: HomeVideoItem[];
  communityPosts?: HomeWallPost[];
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
  tickerItems = [],
  news = [],
  videos = [],
  communityPosts = [],
}: HomePageProps) {
  const hasReactions = Boolean(reactionsSlot);
  const hasEngagement = Boolean(engagementSlot);

  return (
    <section className="relative min-h-[calc(100vh-46px)] bg-[#FBF8F2] pb-10 text-[#171411]">
      <HomeTicker items={tickerItems} />
      <div className="relative z-[2] mx-auto flex w-full max-w-[1320px] flex-col gap-6 px-4 pt-10 sm:px-6 sm:pt-14 lg:px-10">
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

        {hasReactions || hasEngagement ? (
          <div className={`order-2 grid gap-6 ${hasReactions && hasEngagement ? "xl:grid-cols-2" : ""}`}>
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

        <div id="live-news-section" className="order-5">
          <HomeNewsRail items={news} />
        </div>

        <div id="live-videos-section" className="order-6">
          <HomeVideoRail videos={videos} />
        </div>

        <div id="live-komunita-section" className="order-7">
          <HomeKomunita posts={communityPosts} />
        </div>
      </div>
    </section>
  );
}

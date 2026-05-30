"use client";

import Image from "next/image";
import { useRef } from "react";

import { VeroxCarouselChevron } from "@/components/abj/VeroxCarouselChevron";
import { VeroxDoubleDivider } from "@/components/abj/VeroxDoubleDivider";
import type { LiveChannelGroup, LiveChannelVideo } from "@/components/abj/ChannelDirectory";

type LiveChannelsMobileProps = {
  channels: LiveChannelGroup[];
  activeChannelName: string | null;
  onToggleChannel: (channel: LiveChannelGroup) => void;
  onSelectVideo: (payload: { channelName: string; video: LiveChannelVideo }) => void;
  activeChannel: LiveChannelGroup | null;
  fetchedVideosByChannel: Record<string, LiveChannelVideo[]>;
  loadingByChannel: Record<string, boolean>;
  errorByChannel: Record<string, string>;
  initialsFromName: (channelName: string) => string;
};

function MobileChannelAvatar({
  channelName,
  avatarUrl,
  initialsFromName,
}: {
  channelName: string;
  avatarUrl: string | null;
  initialsFromName: (channelName: string) => string;
}) {
  return (
    <span className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#000000]">
      {avatarUrl ? (
        <Image src={avatarUrl} alt={`${channelName} logo`} fill className="object-cover" unoptimized />
      ) : (
        <span className="verox-font-myriad-bold text-[10px] uppercase text-white">{initialsFromName(channelName)}</span>
      )}
    </span>
  );
}

export function LiveChannelsMobile({
  channels,
  activeChannelName,
  onToggleChannel,
  onSelectVideo,
  activeChannel,
  fetchedVideosByChannel,
  loadingByChannel,
  errorByChannel,
  initialsFromName,
}: LiveChannelsMobileProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const scrollBy = (direction: "left" | "right") => {
    const container = scrollRef.current;
    if (!container) return;
    const maxLeft = Math.max(0, container.scrollWidth - container.clientWidth);
    if (maxLeft <= 6) return;
    const step = Math.max(220, Math.round(container.clientWidth * 0.72));
    const currentLeft = container.scrollLeft;
    if (direction === "right") {
      const nextLeft = currentLeft + step;
      container.scrollTo({ left: nextLeft >= maxLeft - 2 ? 0 : Math.min(maxLeft, nextLeft), behavior: "smooth" });
      return;
    }
    const nextLeft = currentLeft - step;
    container.scrollTo({ left: currentLeft <= 2 ? maxLeft : Math.max(0, nextLeft), behavior: "smooth" });
  };

  return (
    <section className="verox-live-mobile-only bg-white px-0 py-4">
      <h3 className="verox-font-myriad-regular mb-3 text-center text-[24px] uppercase leading-normal tracking-[0.05em] text-[#F37021]">
        KANÁLY
      </h3>

      {channels.length === 0 ? (
        <p className="verox-font-myriad-regular px-3 py-2 text-sm text-[#717171]">Seznam kanálů se připravuje.</p>
      ) : (
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => scrollBy("left")} className="px-1" aria-label="Posunout kanály doleva">
            <VeroxCarouselChevron direction="left" />
          </button>

          <div ref={scrollRef} className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex min-w-max gap-2 px-1">
              {channels.map((channel) => {
                const selected = activeChannelName === channel.channelName;
                return (
                  <button
                    key={`mobile-${channel.channelName}`}
                    type="button"
                    onClick={() => onToggleChannel(channel)}
                    className={`inline-flex min-h-[52px] w-[72vw] max-w-[280px] shrink-0 items-center gap-2 border bg-white px-2 py-2 text-left ${
                      selected ? "border-[3px] border-[#F37021]" : "border border-[#717171]"
                    }`}
                  >
                    <MobileChannelAvatar channelName={channel.channelName} avatarUrl={channel.avatarUrl} initialsFromName={initialsFromName} />
                    <span className="verox-font-myriad-bold line-clamp-2 text-[10px] uppercase leading-tight text-[#303030]">{channel.channelName}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <button type="button" onClick={() => scrollBy("right")} className="px-1" aria-label="Posunout kanály doprava">
            <VeroxCarouselChevron direction="right" />
          </button>
        </div>
      )}

      <p className="verox-font-myriad-regular mt-3 px-3 text-center text-[9px] uppercase tracking-[0.05em] text-[#303030]">
        KLIKNĚTE NA VYBRANÝ KANÁL PRO ZOBRAZENÍ DETAILU.
      </p>

      {activeChannel ? (
        <div className="mt-3 px-3">
          <div className="mb-2 flex items-center gap-2">
            <MobileChannelAvatar
              channelName={activeChannel.channelName}
              avatarUrl={activeChannel.avatarUrl}
              initialsFromName={initialsFromName}
            />
            <p className="verox-font-myriad-bold text-[12px] uppercase text-[#303030]">{activeChannel.channelName}</p>
          </div>
          {(() => {
            const fallbackVideos = fetchedVideosByChannel[activeChannel.channelName] ?? [];
            const latestVideos = (activeChannel.videos.length > 0 ? activeChannel.videos : fallbackVideos).slice(0, 4);
            const loadingFallbackVideos = Boolean(loadingByChannel[activeChannel.channelName]);
            const loadingError = errorByChannel[activeChannel.channelName] ?? "";
            if (loadingFallbackVideos) {
              return <p className="verox-font-myriad-regular text-[10px] text-[#717171]">Načítám nejnovější videa kanálu…</p>;
            }
            if (latestVideos.length > 0) {
              return (
                <div className="grid gap-2">
                  {latestVideos.map((video) => (
                    <button
                      key={`${activeChannel.channelName}-${video.videoId}`}
                      type="button"
                      onClick={() => onSelectVideo({ channelName: activeChannel.channelName, video })}
                      className="verox-font-myriad-regular border border-[#717171] px-2 py-2 text-left text-[10px] text-[#303030]"
                    >
                      {video.title}
                    </button>
                  ))}
                </div>
              );
            }
            return (
              <p className="verox-font-myriad-regular text-[10px] text-[#717171]">
                {loadingError || "Kanál momentálně neposkytuje dostupná videa."}
              </p>
            );
          })()}
        </div>
      ) : null}

      <VeroxDoubleDivider className="mt-4" />
    </section>
  );
}

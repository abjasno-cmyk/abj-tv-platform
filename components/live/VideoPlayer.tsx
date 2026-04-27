"use client";

import { useEffect, useMemo, useState } from "react";
import YouTube, { type YouTubeProps } from "react-youtube";

type VideoPlayerProps = {
  videoUrl: string | null;
  title: string;
  progress: number;
  nextStartTimestamp: number;
  onEnded?: () => void;
  compact?: boolean;
};

function parseVideoId(videoUrl: string | null): string | null {
  if (!videoUrl) return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(videoUrl)) return videoUrl;
  try {
    const url = new URL(videoUrl);
    if (url.hostname.includes("youtu.be")) {
      const id = url.pathname.replace("/", "").trim();
      return id || null;
    }
    if (url.hostname.includes("youtube.com")) {
      const id = url.searchParams.get("v");
      return id && id.trim().length > 0 ? id.trim() : null;
    }
  } catch {
    return null;
  }
  return null;
}

function formatCountdown(nextStartTimestamp: number): string {
  const diffSec = Math.max(0, Math.floor((nextStartTimestamp - Date.now()) / 1000));
  const minutes = Math.floor(diffSec / 60);
  const seconds = diffSec % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function VideoPlayer({
  videoUrl,
  title,
  progress,
  nextStartTimestamp,
  onEnded,
  compact = false,
}: VideoPlayerProps) {
  const [countdown, setCountdown] = useState(() => formatCountdown(nextStartTimestamp));
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const videoId = parseVideoId(videoUrl);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCountdown(formatCountdown(nextStartTimestamp));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [nextStartTimestamp]);

  const playerOptions = useMemo<YouTubeProps["opts"]>(
    () => ({
      width: "100%",
      height: "100%",
      playerVars: {
        autoplay: 1,
        mute: 1,
        controls: 1,
        rel: 0,
        modestbranding: 1,
        playsinline: 1,
      },
    }),
    []
  );

  return (
    <section className="relative overflow-hidden rounded-2xl border border-[#274268] bg-[#03060D] shadow-[0_18px_44px_rgba(0,0,0,0.55)]">
      <div className={`relative aspect-video w-full ${compact ? "mx-auto max-w-[920px]" : ""}`}>
        {videoId ? (
          <YouTube
            videoId={videoId}
            opts={playerOptions}
            iframeClassName="absolute inset-0 h-full w-full"
            onEnd={onEnded}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-base font-medium text-abj-text2">
            Video není dostupné
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-[#04070D] via-[#04070Dd9] to-transparent" />
        <div className="absolute left-3 top-3 z-10 rounded-full border border-[#7A1F2A] bg-[#390A13]/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#FFD6DC] shadow-[0_0_16px_rgba(178,37,53,0.35)]">
          Živě
        </div>
        <div className="absolute inset-x-0 bottom-0 p-4 md:p-5">
          <p className="line-clamp-2 text-base font-semibold leading-tight text-white md:text-xl">{title}</p>
          <div className="mt-3 h-2 w-full rounded-full bg-[#dbe9ff1a]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#CF2D45] via-[#ED4559] to-[#3FA8FF] transition-all duration-500"
              style={{ width: `${clampedProgress * 100}%` }}
            />
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-[0.14em] text-[#91A9C8]">Průběh segmentu</p>
            <p className="text-sm font-semibold text-[#A8D5FF]">Další segment za {countdown}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

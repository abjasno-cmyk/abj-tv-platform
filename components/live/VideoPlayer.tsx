"use client";

import { useEffect, useMemo, useState } from "react";
import YouTube, { type YouTubeProps } from "react-youtube";

type VideoPlayerProps = {
  videoUrl: string | null;
  title: string;
  progress: number;
  nextStartTimestamp: number;
  onEnded?: () => void;
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
        rel: 0,
        modestbranding: 1,
        playsinline: 1,
      },
    }),
    []
  );

  return (
    <section className="relative overflow-hidden rounded-xl border border-white/10 bg-black">
      <div className="relative w-full pb-[56.25%]">
        {videoId ? (
          <YouTube
            videoId={videoId}
            opts={playerOptions}
            iframeClassName="absolute inset-0 h-full w-full"
            onEnd={onEnded}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-abj-text2">
            Video není dostupné
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/85 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-3 md:p-4">
          <p className="line-clamp-2 text-sm font-semibold text-white md:text-base">{title}</p>
          <div className="mt-2 h-1.5 w-full rounded-full bg-white/15">
            <div
              className="h-full rounded-full bg-gradient-to-r from-red-500 via-red-400 to-sky-400 transition-all duration-500"
              style={{ width: `${clampedProgress * 100}%` }}
            />
          </div>
          <p className="mt-2 text-xs font-medium text-sky-200">Další segment za {countdown}</p>
        </div>
      </div>
    </section>
  );
}

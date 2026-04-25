"use client";

import { useMemo } from "react";
import YouTube, { type YouTubeProps } from "react-youtube";

type ViewerCounterMode = "boosted" | "baseline";

const VIEWER_COUNTER_MODE: ViewerCounterMode = "boosted";

type LiveVideoPlayerProps = {
  videoId: string | null;
  title: string;
  startSeconds?: number;
  realViewers: number;
};

function resolveDisplayViewers(realViewers: number): number {
  if (VIEWER_COUNTER_MODE === "baseline") {
    return Math.max(realViewers, 10_000);
  }
  return Math.max(realViewers + 8_500, 10_000);
}

export function LiveVideoPlayer({ videoId, title, startSeconds = 0, realViewers }: LiveVideoPlayerProps) {
  const roundedViewers = Math.round(resolveDisplayViewers(realViewers) / 100) * 100;
  const opts = useMemo<YouTubeProps["opts"]>(
    () => ({
      width: "100%",
      height: "100%",
      playerVars: {
        autoplay: 1,
        mute: 1,
        rel: 0,
        modestbranding: 1,
        start: Math.max(0, Math.floor(startSeconds)),
      },
    }),
    [startSeconds]
  );

  return (
    <section className="overflow-hidden rounded-xl border border-[var(--abj-gold-dim)] bg-[var(--card)]">
      <div className="relative aspect-video w-full">
        {videoId ? (
          <YouTube videoId={videoId} title={title} iframeClassName="absolute inset-0 h-full w-full" opts={opts} />
        ) : (
          <div className="absolute inset-0 grid place-items-center bg-[#060B14]">
            <p className="text-sm text-abj-text2">Video není dostupné</p>
          </div>
        )}

        <div className="absolute left-4 top-4 flex items-center gap-2 rounded-md bg-black/55 px-2 py-1.5">
          <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-sm font-semibold text-white">LIVE</span>
        </div>

        <div className="absolute bottom-4 right-4 rounded-md bg-black/55 px-3 py-1.5 text-xs text-white">
          přes {roundedViewers.toLocaleString("cs-CZ")} sleduje
        </div>
      </div>
    </section>
  );
}

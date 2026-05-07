"use client";

import { useMemo, useState } from "react";
import YouTube, { type YouTubeProps } from "react-youtube";

type LivePlayerProps = {
  videoId: string | null;
  title: string;
  channel: string;
  isLive: boolean;
  startSeconds?: number;
  remainingLabel: string;
  progressPercent: number;
  onPlayToggle?: () => void;
  isFiller?: boolean;
};

export function LivePlayer({
  videoId,
  title,
  channel,
  isLive,
  startSeconds = 0,
  remainingLabel,
  progressPercent,
  onPlayToggle,
  isFiller = false,
}: LivePlayerProps) {
  const [manualUnmuteVideoId, setManualUnmuteVideoId] = useState<string | null>(null);
  const isMuted = manualUnmuteVideoId !== videoId;
  const showUnmuteButton = Boolean(videoId) && isMuted;
  const offsetSeconds = Math.max(0, Math.floor(startSeconds));
  const clampedProgress = Math.max(0, Math.min(100, progressPercent));

  const opts = useMemo<YouTubeProps["opts"]>(
    () => ({
      width: "100%",
      height: "100%",
      playerVars: {
        autoplay: 1,
        mute: isMuted ? 1 : 0,
        start: offsetSeconds,
        rel: 0,
        modestbranding: 1,
      },
    }),
    [isMuted, offsetSeconds]
  );

  return (
    <section className="relative overflow-hidden rounded-[28px] border border-[rgba(17,17,17,0.1)] bg-white shadow-[0_18px_45px_rgba(17,17,17,0.08)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[rgba(255,106,0,0.14)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-28 left-1/3 h-56 w-56 rounded-full border border-[rgba(255,106,0,0.22)]"
      />

      <div className="relative aspect-video w-full overflow-hidden bg-[var(--abj-light)]">
        {videoId ? (
          <div className="abj-slow-zoom absolute inset-0">
            <YouTube
              key={`${videoId}-${isMuted ? "muted" : "unmuted"}-${offsetSeconds}`}
              videoId={videoId}
              title={title}
              iframeClassName="absolute inset-0 h-full w-full"
              opts={opts}
            />
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="abj-dot-grid absolute inset-0 opacity-35" />
            <div className="relative flex h-40 w-40 items-center justify-center rounded-full border border-[rgba(255,106,0,0.3)] bg-white">
              <span className="h-5 w-5 rounded-full bg-[var(--abj-red)]" />
            </div>
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,106,0,0.14)_0%,rgba(255,255,255,0)_45%,rgba(17,17,17,0.62)_100%)]" />

        {showUnmuteButton ? (
          <button
            type="button"
            onClick={() => {
              setManualUnmuteVideoId(videoId);
              onPlayToggle?.();
            }}
            className="absolute right-4 top-4 rounded-full border border-white/45 bg-black/52 px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-black/62"
          >
            Zapnout zvuk
          </button>
        ) : null}

        {isFiller ? (
          <div className="pointer-events-none absolute inset-0">
            <div className="abj-dot-grid absolute inset-0 opacity-20" />
            <span className="abj-soft-pulse absolute right-6 top-6 h-4 w-4 rounded-full bg-[var(--abj-red)]" />
            <span className="abj-soft-pulse absolute bottom-6 left-6 h-3 w-3 rounded-full bg-[var(--abj-red)]" />
            <span className="absolute bottom-5 left-12 text-[11px] uppercase tracking-[0.16em] text-white/78">
              ABJ mezi pořady
            </span>
            <span className="abj-circular-return absolute inset-0 bg-[rgba(255,106,0,0.12)]" />
          </div>
        ) : null}
      </div>

      <div className="relative z-10 flex flex-wrap items-end justify-between gap-6 px-6 py-6">
        <div className="max-w-[78%]">
          {isLive ? (
            <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-[var(--abj-red)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white">
              <span className="abj-live-dot h-2 w-2 rounded-full bg-white" />
              Live
            </span>
          ) : null}
          <h1 className="text-[clamp(1.5rem,3vw,2.5rem)] font-[800] leading-[1.05] text-[var(--abj-text1)]">
            {title}
          </h1>
          <p className="mt-2 text-sm uppercase tracking-[0.1em] text-[var(--abj-text2)]">{channel}</p>
        </div>

        <div className="min-w-[145px] space-y-2 rounded-2xl bg-[var(--abj-light)] p-3">
          <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--abj-text2)]">zbývá</p>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[rgba(17,17,17,0.12)]">
            <div
              className="h-full rounded-full bg-[var(--abj-red)] transition-[width] duration-700 ease-out"
              style={{ width: `${clampedProgress}%` }}
            />
          </div>
          <p className="text-sm font-medium text-[var(--abj-text1)]">{remainingLabel}</p>
        </div>
      </div>
    </section>
  );
}

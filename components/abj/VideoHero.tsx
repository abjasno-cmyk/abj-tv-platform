"use client";

import { useMemo, useState } from "react";
import YouTube, { type YouTubeProps } from "react-youtube";

type VideoHeroProps = {
  videoId: string | null;
  title: string;
  channel: string;
  isLive: boolean;
  startSeconds?: number;
  remainingLabel: string;
  progressPercent: number;
  onPlayToggle?: () => void;
  onVideoEnded?: () => void;
};

export function VideoHero({
  videoId,
  title,
  channel,
  isLive,
  startSeconds = 0,
  remainingLabel,
  progressPercent,
  onPlayToggle,
  onVideoEnded,
}: VideoHeroProps) {
  const clampedProgress = Math.max(0, Math.min(100, progressPercent));
  const [manualUnmuteVideoId, setManualUnmuteVideoId] = useState<string | null>(null);
  const isMuted = manualUnmuteVideoId !== videoId;
  const showUnmuteButton = Boolean(videoId) && isMuted;
  const offsetSeconds = Math.max(0, Math.floor(startSeconds));
  const offsetBadge =
    offsetSeconds > 0
      ? `+${String(Math.floor(offsetSeconds / 60)).padStart(2, "0")}:${String(offsetSeconds % 60).padStart(
          2,
          "0"
        )} od začátku pořadu`
      : null;

  const playerOptions = useMemo<YouTubeProps["opts"]>(
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
    <section className="relative flex min-h-[200px] overflow-hidden bg-[#05090F]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 select-none text-center font-[var(--font-serif)] text-[130px] leading-[1] text-[var(--abj-gold)] opacity-[0.035]"
        style={{ display: "grid", placeItems: "center" }}
      >
        ABJ
      </div>

      <div className="relative z-[2] aspect-video w-full bg-[#05090F]">
        {videoId ? (
          <>
            <YouTube
              key={`${videoId}-${isMuted ? "muted" : "unmuted"}-${Math.max(0, Math.floor(startSeconds))}`}
              videoId={videoId}
              title={title}
              iframeClassName="absolute inset-0 h-full w-full"
              opts={playerOptions}
              onEnd={() => {
                onVideoEnded?.();
              }}
            />
            {showUnmuteButton ? (
              <button
                type="button"
                onClick={() => {
                  setManualUnmuteVideoId(videoId);
                  onPlayToggle?.();
                }}
                className="absolute right-3 top-3 z-10 rounded bg-black/65 px-3 py-2 text-xs text-white"
              >
                Zapnout zvuk
              </button>
            ) : null}
            {offsetBadge ? (
              <span className="absolute left-3 top-3 z-10 rounded bg-black/65 px-3 py-2 text-xs text-white">
                {offsetBadge}
              </span>
            ) : null}
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <button
              type="button"
              onClick={onPlayToggle}
              className="h-[50px] w-[50px] rounded-full border-[1.5px] border-[rgba(198,168,91,0.35)] bg-[rgba(198,168,91,0.07)] transition-colors duration-200 hover:bg-[rgba(198,168,91,0.14)]"
              aria-label="Přehrát"
            >
              <span
                className="ml-[4px] inline-block h-0 w-0 border-b-[9px] border-l-[13px] border-t-[9px] border-b-transparent border-l-[var(--abj-gold)] border-t-transparent align-middle opacity-75"
                aria-hidden="true"
              />
            </button>
          </div>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between bg-[rgba(5,9,15,0.90)] px-[18px] py-[13px]">
        <div className="min-w-0 pr-4">
          {isLive ? (
            <span className="mb-[6px] inline-flex items-center gap-[5px] rounded-[2px] bg-[var(--abj-red)] px-2 py-[3px] font-[var(--font-sans)] text-[9px] uppercase tracking-[0.15em] text-[#F0D5D5]">
              <span className="h-[5px] w-[5px] animate-[blink_2s_ease-in-out_infinite] rounded-full bg-[#F0D5D5]" />
              VYSÍLÁNÍ
            </span>
          ) : null}
          <h2 className="mb-[3px] line-clamp-2 font-[var(--font-serif)] text-[19px] font-semibold leading-[1.25] text-[var(--abj-text1)]">
            {title}
          </h2>
          <p className="font-[var(--font-sans)] text-[11px] text-[var(--abj-text2)]">{channel}</p>
        </div>

        <div className="shrink-0 text-right">
          <p className="font-[var(--font-sans)] text-[9px] uppercase tracking-[0.1em] text-[var(--abj-text2)]">
            zbývá
          </p>
          <div className="mt-1 h-[2px] w-[76px] rounded-[1px] bg-[rgba(198,168,91,0.18)]">
            <div
              className="h-[2px] rounded-[1px] bg-[var(--abj-gold)]"
              style={{ width: `${clampedProgress}%` }}
            />
          </div>
          <p className="mt-[5px] font-[var(--font-sans)] text-[11px] text-[var(--abj-text2)]">{remainingLabel}</p>
        </div>
      </div>
    </section>
  );
}

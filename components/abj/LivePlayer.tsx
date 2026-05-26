"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import YouTube, { type YouTubeProps } from "react-youtube";

type LivePlayerProps = {
  videoId: string | null;
  title: string;
  channel: string;
  isLive: boolean;
  startSeconds?: number;
  remainingLabel: string;
  progressPercent: number;
  onGoLive: () => void;
  isFiller?: boolean;
  continueFromSeconds?: number | null;
  onContinueFromSaved?: (seconds: number) => void;
  onPlaybackSample?: (sample: { videoId: string; positionSeconds: number; durationSeconds: number }) => void;
};

type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};

type YouTubePlayerHandle = {
  getCurrentTime: () => number;
  getDuration: () => number;
  playVideo?: () => void;
  pauseVideo?: () => void;
  mute?: () => void;
  unMute?: () => void;
};

function readFullscreenElement(doc: FullscreenDocument): Element | null {
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

async function requestFullscreenFor(element: FullscreenElement): Promise<void> {
  if (typeof element.requestFullscreen === "function") {
    await element.requestFullscreen();
    return;
  }
  if (typeof element.webkitRequestFullscreen === "function") {
    await element.webkitRequestFullscreen();
  }
}

async function exitFullscreenFor(doc: FullscreenDocument): Promise<void> {
  if (typeof doc.exitFullscreen === "function") {
    await doc.exitFullscreen();
    return;
  }
  if (typeof doc.webkitExitFullscreen === "function") {
    await doc.webkitExitFullscreen();
  }
}

export function LivePlayer({
  videoId,
  title,
  channel,
  isLive,
  startSeconds = 0,
  remainingLabel,
  progressPercent,
  onGoLive,
  isFiller = false,
  continueFromSeconds = null,
  onContinueFromSaved,
  onPlaybackSample,
}: LivePlayerProps) {
  const playerShellRef = useRef<HTMLElement | null>(null);
  const youtubePlayerRef = useRef<YouTubePlayerHandle | null>(null);
  const [mutedByVideoId, setMutedByVideoId] = useState<Record<string, boolean>>({});
  const [pausedByVideoId, setPausedByVideoId] = useState<Record<string, boolean>>({});
  const [isFullscreen, setIsFullscreen] = useState(false);
  const isMuted = videoId ? (mutedByVideoId[videoId] ?? true) : true;
  const isPaused = videoId ? (pausedByVideoId[videoId] ?? false) : false;
  const offsetSeconds = Math.max(0, Math.floor(startSeconds));
  const clampedProgress = Math.max(0, Math.min(100, progressPercent));

  useEffect(() => {
    const doc = document as FullscreenDocument;
    const syncFullscreen = () => setIsFullscreen(Boolean(readFullscreenElement(doc)));
    syncFullscreen();
    doc.addEventListener("fullscreenchange", syncFullscreen);
    doc.addEventListener("webkitfullscreenchange", syncFullscreen);
    return () => {
      doc.removeEventListener("fullscreenchange", syncFullscreen);
      doc.removeEventListener("webkitfullscreenchange", syncFullscreen);
    };
  }, []);

  useEffect(() => {
    youtubePlayerRef.current = null;
  }, [videoId]);

  useEffect(() => {
    if (!videoId || !onPlaybackSample) return;
    const timer = window.setInterval(() => {
      const player = youtubePlayerRef.current;
      if (!player) return;
      const positionSeconds = Math.max(0, Math.floor(player.getCurrentTime()));
      const durationSeconds = Math.max(0, Math.floor(player.getDuration()));
      if (!Number.isFinite(positionSeconds) || !Number.isFinite(durationSeconds) || durationSeconds <= 0) return;
      onPlaybackSample({
        videoId,
        positionSeconds,
        durationSeconds,
      });
    }, 4000);

    return () => {
      window.clearInterval(timer);
    };
  }, [onPlaybackSample, videoId]);

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
        controls: 1,
      },
    }),
    [isMuted, offsetSeconds]
  );

  const toggleFullscreen = useCallback(async () => {
    const doc = document as FullscreenDocument;
    try {
      if (readFullscreenElement(doc)) {
        await exitFullscreenFor(doc);
        return;
      }
      const element = playerShellRef.current as FullscreenElement | null;
      if (!element) return;
      await requestFullscreenFor(element);
    } catch (error) {
      console.warn("live-player-fullscreen-toggle-failed", error);
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (!videoId) return;
    const nextMuted = !isMuted;
    setMutedByVideoId((prev) => ({ ...prev, [videoId]: nextMuted }));
    const player = youtubePlayerRef.current;
    if (!player) return;
    if (nextMuted) {
      player.mute?.();
    } else {
      player.unMute?.();
    }
  }, [isMuted, videoId]);

  const togglePause = useCallback(() => {
    if (!videoId) return;
    const player = youtubePlayerRef.current;
    if (!player) return;
    if (isPaused) {
      player.playVideo?.();
      setPausedByVideoId((prev) => ({ ...prev, [videoId]: false }));
      return;
    }
    player.pauseVideo?.();
    setPausedByVideoId((prev) => ({ ...prev, [videoId]: true }));
  }, [isPaused, videoId]);

  return (
    <section
      id="live-player-shell"
      ref={playerShellRef}
      className="relative overflow-hidden rounded-[32px] border border-[rgba(17,17,17,0.14)] bg-white shadow-[0_26px_55px_rgba(17,17,17,0.11)]"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[rgba(237,116,47,0.2)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-28 left-1/3 h-56 w-56 rounded-full border border-[rgba(237,116,47,0.22)]"
      />

      <div className="relative aspect-video w-full overflow-hidden bg-[#0B0D10]">
        {videoId ? (
          <div className="abj-slow-zoom absolute inset-0">
            <YouTube
              key={`${videoId}-${isMuted ? "muted" : "unmuted"}-${offsetSeconds}`}
              videoId={videoId}
              title={title}
              iframeClassName="absolute inset-0 h-full w-full"
              opts={opts}
              onReady={(event) => {
                youtubePlayerRef.current = event.target as unknown as YouTubePlayerHandle;
                if (isMuted) {
                  youtubePlayerRef.current.mute?.();
                } else {
                  youtubePlayerRef.current.unMute?.();
                }
              }}
            />
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="abj-dot-grid absolute inset-0 opacity-30" />
            <div className="relative flex h-40 w-40 items-center justify-center rounded-full border border-[rgba(237,116,47,0.4)] bg-[rgba(255,255,255,0.9)]">
              <span className="h-5 w-5 rounded-full bg-[#ED742F]" />
            </div>
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.2)_0%,rgba(0,0,0,0.02)_42%,rgba(0,0,0,0.65)_100%)]" />

        <div className="absolute left-4 top-4 z-10 space-y-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ED742F] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
            <span className="abj-live-dot h-1.5 w-1.5 rounded-full bg-white" />
            {isLive ? "Živě" : "Záznam"}
          </span>
          <p className="rounded-full bg-black/50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/90">
            {channel}
          </p>
        </div>

        <div className="absolute right-3 top-1/2 z-10 -translate-y-1/2">
          <div className="flex flex-col items-center gap-2 rounded-[18px] border border-white/20 bg-black/45 p-2 backdrop-blur-sm">
            <button
              type="button"
              onClick={() => {
                void toggleFullscreen();
              }}
              aria-label={isFullscreen ? "Ukončit režim celé obrazovky" : "Přepnout celou obrazovku"}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-black/40 text-lg text-white transition hover:border-[#ED742F] hover:text-[#ED742F]"
            >
              {isFullscreen ? "⤡" : "⛶"}
            </button>
            <button
              type="button"
              onClick={toggleMute}
              aria-label={isMuted ? "Zapnout zvuk" : "Vypnout zvuk"}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-black/40 text-lg text-white transition hover:border-[#ED742F] hover:text-[#ED742F]"
            >
              {isMuted ? "🔇" : "🔊"}
            </button>
            <button
              type="button"
              onClick={togglePause}
              aria-label={isPaused ? "Spustit přehrávání" : "Pozastavit přehrávání"}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-black/40 text-lg text-white transition hover:border-[#ED742F] hover:text-[#ED742F]"
            >
              {isPaused ? "▶" : "⏸"}
            </button>
          </div>
        </div>

        {offsetSeconds > 0 ? (
          <span className="absolute bottom-4 left-4 z-10 rounded-full bg-black/50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/90">
            +{String(Math.floor(offsetSeconds / 60)).padStart(2, "0")}:{String(offsetSeconds % 60).padStart(2, "0")}
          </span>
        ) : null}

        {isFiller ? (
          <div className="pointer-events-none absolute inset-0">
            <div className="abj-dot-grid absolute inset-0 opacity-20" />
            <span className="abj-soft-pulse absolute right-6 top-6 h-4 w-4 rounded-full bg-[#ED742F]" />
            <span className="abj-soft-pulse absolute bottom-6 left-6 h-3 w-3 rounded-full bg-[#ED742F]" />
            <span className="absolute bottom-5 left-12 text-[11px] uppercase tracking-[0.16em] text-white/78">
              VEROX mezi pořady
            </span>
            <span className="abj-circular-return absolute inset-0 bg-[rgba(237,116,47,0.12)]" />
          </div>
        ) : null}
      </div>

      <div className="relative z-10 grid gap-4 border-t border-[rgba(17,17,17,0.1)] bg-white px-5 py-5 md:grid-cols-[minmax(0,1fr)_240px] md:gap-6 md:px-6 md:py-6">
        <div>
          <h1 className="text-[clamp(1.35rem,2.7vw,2.45rem)] font-black leading-[1.06] text-[var(--abj-text1)]">
            {title}
          </h1>
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--abj-text2)]">{channel}</p>
        </div>

        <div className="space-y-2 rounded-2xl border border-[#ED742F]/30 bg-[#FFF2EA] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#A5491D]">zbývá</p>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[rgba(237,116,47,0.2)]">
            <div
              className="h-full rounded-full bg-[#ED742F] transition-[width] duration-700 ease-out"
              style={{ width: `${clampedProgress}%` }}
            />
          </div>
          <p className="text-sm font-semibold text-[#111111]">{remainingLabel}</p>
        </div>
      </div>

      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-t border-[rgba(17,17,17,0.1)] bg-[#F8F5F0] px-5 py-4 md:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onGoLive}
            disabled={isLive}
            className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
              isLive
                ? "cursor-default border-[#ED742F] bg-[#ED742F] text-white"
                : "border-[#ED742F] bg-white text-[#A5491D] hover:bg-[rgba(237,116,47,0.1)]"
            }`}
          >
            <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${isLive ? "bg-white/20" : "bg-[#ED742F] text-white"}`}>
              ↺
            </span>
            {isLive ? "Právě živě" : "Zpět na živé vysílání"}
          </button>
          {!isLive && continueFromSeconds !== null && continueFromSeconds > 30 ? (
            <button
              type="button"
              onClick={() => onContinueFromSaved?.(continueFromSeconds)}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#ED742F]/45 bg-[rgba(237,116,47,0.1)] px-4 py-2 text-sm font-semibold text-[#A5491D] hover:bg-[rgba(237,116,47,0.16)]"
            >
              Pokračovat od {Math.floor(continueFromSeconds / 60)
                .toString()
                .padStart(2, "0")}
              :{Math.floor(continueFromSeconds % 60).toString().padStart(2, "0")}
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

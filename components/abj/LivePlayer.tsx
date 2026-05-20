"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
};

type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
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
}: LivePlayerProps) {
  const playerShellRef = useRef<HTMLElement | null>(null);
  const [manualUnmuteVideoId, setManualUnmuteVideoId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const isMuted = manualUnmuteVideoId !== videoId;
  const showUnmuteButton = Boolean(videoId) && isMuted;
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
    <section
      id="live-player-shell"
      ref={playerShellRef}
      className="relative overflow-hidden rounded-[28px] border border-[rgba(17,17,17,0.1)] bg-white shadow-[0_18px_45px_rgba(17,17,17,0.08)]"
    >
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

      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-t border-[rgba(17,17,17,0.1)] bg-[rgba(249,246,241,0.85)] px-6 py-3">
        <button
          type="button"
          onClick={onGoLive}
          disabled={isLive}
          className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
            isLive
              ? "cursor-default border-[var(--abj-red)] bg-[var(--abj-red)] text-white"
              : "border-[var(--abj-red)] bg-white text-[var(--abj-red)] hover:bg-[rgba(255,106,0,0.1)]"
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-current" />
          {isLive ? "Právě živě" : "Zpět na živé vysílání"}
        </button>

        <button
          type="button"
          onClick={async () => {
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
          }}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[rgba(17,17,17,0.24)] bg-white px-4 py-2 text-sm font-semibold text-abj-text1 transition hover:border-[#FF6A00] hover:text-[#C14900]"
          aria-label={isFullscreen ? "Ukončit režim celé obrazovky" : "Zvětšit přehrávač na celou obrazovku"}
        >
          <span
            aria-hidden="true"
            className={`inline-block h-3.5 w-3.5 border border-current ${
              isFullscreen ? "rounded-[1px] border-2" : "rounded-[2px]"
            }`}
          />
          {isFullscreen ? "Ukončit celou obrazovku" : "Zvětšit na celou obrazovku"}
        </button>
      </div>
    </section>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { LiveChannelGroup } from "@/components/abj/ChannelDirectory";
import type { DayProgram } from "@/lib/epg-types";
import { LiveAlert } from "@/components/abj/LiveAlert";
import { HomePage } from "@/components/abj/HomePage";
import { CommentsSection } from "@/components/auth/CommentsSection";
import { LikeButton } from "@/components/auth/LikeButton";
import { useAuth } from "@/components/auth/AuthProvider";
import { ChatPanel } from "@/components/ChatPanel";

type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
};

async function requestFullscreenFor(element: FullscreenElement): Promise<void> {
  if (typeof element.requestFullscreen === "function") {
    await element.requestFullscreen();
    return;
  }
  if (typeof element.webkitRequestFullscreen === "function") {
    await element.webkitRequestFullscreen();
  }
}

type LivePageProps = {
  epg: DayProgram[];
  initialVideoId: string | null;
  initialTitle: string;
  initialChannelName: string;
  initialStartSeconds?: number;
  channels: LiveChannelGroup[];
};

export default function LivePage({
  epg,
  initialVideoId,
  initialTitle,
  initialChannelName,
  initialStartSeconds = 0,
  channels,
}: LivePageProps) {
  const { isAuthenticated } = useAuth();
  const safeEpg = epg;
  const linearSourceRef = useRef({
    videoId: initialVideoId,
    title: initialTitle,
    channelName: initialChannelName,
    startSeconds: Math.max(0, Math.floor(initialStartSeconds)),
    capturedAtMs: 0,
  });
  const [videoId, setVideoId] = useState<string | null>(initialVideoId);
  const [title, setTitle] = useState(initialTitle);
  const [channelName, setChannelName] = useState(initialChannelName);
  const [isLive, setIsLive] = useState(() => initialChannelName.toLowerCase().includes("abj"));
  const [startSeconds, setStartSeconds] = useState(() => Math.max(0, Math.floor(initialStartSeconds)));
  const [remainingLabel, setRemainingLabel] = useState("za 12 min");
  const [progressPercent, setProgressPercent] = useState(22);
  const [continueFromSeconds, setContinueFromSeconds] = useState<number | null>(null);
  const lastProgressSaveRef = useRef<{
    videoId: string | null;
    savedAtMs: number;
    positionSeconds: number;
  }>({
    videoId: null,
    savedAtMs: 0,
    positionSeconds: 0,
  });

  const scrollToPlayerAndFullscreen = () => {
    const playerElement = document.getElementById("live-player-shell") as FullscreenElement | null;
    if (!playerElement) return;
    playerElement.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    const fullscreenDocument = document as FullscreenDocument;
    if (fullscreenDocument.fullscreenElement || fullscreenDocument.webkitFullscreenElement) return;
    void requestFullscreenFor(playerElement).catch((error) => {
      console.warn("live-page-auto-fullscreen-failed", error);
    });
  };

  const timelineItems = useMemo(
    () => safeEpg.flatMap((day) => day.items),
    [safeEpg]
  );
  const selectedIndex = useMemo(
    () => timelineItems.findIndex((item) => item.videoId === videoId),
    [timelineItems, videoId]
  );
  const nextItem =
    selectedIndex >= 0
      ? timelineItems[selectedIndex + 1] ?? null
      : timelineItems.length > 1
        ? timelineItems[1]
        : null;
  const isFiller = useMemo(() => {
    const current = timelineItems[selectedIndex] ?? null;
    return current?.type === "vod" && Boolean(current.isABJ) && !videoId;
  }, [timelineItems, selectedIndex, videoId]);

  useEffect(() => {
    linearSourceRef.current.capturedAtMs = Date.now();
  }, []);

  useEffect(() => {
    const tick = () => {
      setProgressPercent((prev) => (prev >= 96 ? 8 : prev + 2));
      if (nextItem) {
        setRemainingLabel(`za ${Math.max(1, Math.round((100 - progressPercent) / 3))} min`);
      } else {
        setRemainingLabel("za chvíli");
      }
    };
    const timer = setInterval(tick, 30_000);
    return () => clearInterval(timer);
  }, [nextItem, progressPercent]);

  useEffect(() => {
    if (!videoId || !isAuthenticated || isLive) {
      const frame = window.requestAnimationFrame(() => {
        setContinueFromSeconds(null);
      });
      return () => window.cancelAnimationFrame(frame);
    }

    let cancelled = false;
    void fetch(`/api/viewer/video-progress?videoId=${encodeURIComponent(videoId)}`, {
      cache: "no-store",
    })
      .then(async (response) => {
        const payload = (await response.json().catch(() => ({}))) as {
          progress?: {
            position_seconds: number;
            completed: boolean;
          } | null;
        };
        if (!response.ok || cancelled) return;
        const progress = payload.progress;
        if (!progress || progress.completed || progress.position_seconds < 20) {
          setContinueFromSeconds(null);
          return;
        }
        setContinueFromSeconds(progress.position_seconds);
      })
      .catch(() => {
        if (!cancelled) setContinueFromSeconds(null);
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isLive, videoId]);

  const handlePlaybackSample = useCallback(
    (sample: { videoId: string; positionSeconds: number; durationSeconds: number }) => {
      if (!isAuthenticated || !videoId || isLive) return;
      if (sample.videoId !== videoId) return;
      if (sample.positionSeconds < 2 || sample.durationSeconds <= 0) return;

      const now = Date.now();
      const progressPercentValue = Math.min(100, (sample.positionSeconds / sample.durationSeconds) * 100);
      const last = lastProgressSaveRef.current;
      const shouldSave =
        last.videoId !== sample.videoId ||
        now - last.savedAtMs >= 12_000 ||
        Math.abs(sample.positionSeconds - last.positionSeconds) >= 20 ||
        progressPercentValue >= 90;
      if (!shouldSave) return;

      lastProgressSaveRef.current = {
        videoId: sample.videoId,
        savedAtMs: now,
        positionSeconds: sample.positionSeconds,
      };
      if (continueFromSeconds !== null && sample.positionSeconds >= continueFromSeconds - 5) {
        setContinueFromSeconds(null);
      }

      void fetch("/api/viewer/video-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId: sample.videoId,
          positionSeconds: sample.positionSeconds,
          durationSeconds: sample.durationSeconds,
          progressPercent: progressPercentValue,
          completed: progressPercentValue >= 90,
        }),
      });
    },
    [continueFromSeconds, isAuthenticated, isLive, videoId]
  );

  return (
    <section
      data-ui-version="abj-geometric-v2"
      className="min-h-screen bg-abj-main text-abj-text1"
    >
      <HomePage
        days={safeEpg}
        channels={channels}
        videoId={videoId}
        title={title}
        channelName={channelName}
        isLive={isLive}
        startSeconds={startSeconds}
        remainingLabel={remainingLabel}
        progressPercent={progressPercent}
        isFiller={isFiller}
        continueFromSeconds={continueFromSeconds}
        onReturnToLive={() => {
          const source = linearSourceRef.current;
          const elapsedSinceLoad =
            source.capturedAtMs > 0 ? Math.max(0, Math.floor((Date.now() - source.capturedAtMs) / 1000)) : 0;
          setVideoId(source.videoId);
          setTitle(source.title);
          setChannelName(source.channelName);
          setStartSeconds(source.startSeconds + elapsedSinceLoad);
          setIsLive(true);
          setContinueFromSeconds(null);
        }}
        onContinueFromSaved={(seconds) => {
          setStartSeconds(Math.max(0, Math.floor(seconds)));
          setIsLive(false);
          setContinueFromSeconds(null);
        }}
        onPlaybackSample={handlePlaybackSample}
        onSelect={(item) => {
          setTitle(item.title);
          setChannelName(item.channelName);
          setVideoId(item.videoId);
          setStartSeconds(0);
          setIsLive(item.type === "live" || item.channelName.toLowerCase().includes("abj"));
          setContinueFromSeconds(null);
        }}
        onSelectChannelVideo={({ channelName: selectedChannelName, video }) => {
          scrollToPlayerAndFullscreen();
          setTitle(video.title);
          setChannelName(selectedChannelName);
          setVideoId(video.videoId);
          setStartSeconds(0);
          setIsLive(false);
          setContinueFromSeconds(null);
        }}
        engagementSlot={
          videoId ? (
            <section className="rounded-2xl border border-[var(--abj-gold-dim)] bg-white p-4 shadow-[0_8px_20px_rgba(17,17,17,0.08)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.12em] text-abj-text2">Váš bezplatný divácký účet</p>
                  <p className="text-sm text-abj-text1">Komentujte, lajkujte a pokračujte tam, kde jste skončili.</p>
                </div>
                <LikeButton entityType="video" entityId={videoId} />
              </div>
            </section>
          ) : null
        }
        reactionsSlot={videoId ? <CommentsSection entityType="video" entityId={videoId} heading="Reakce diváků na toto video" /> : null}
      />
      <LiveAlert
        currentVideoId={videoId}
        onWatchLive={(video) => {
          setVideoId(video);
          setStartSeconds(0);
          setIsLive(true);
        }}
      />
      <div className="mx-auto w-full max-w-[1200px] space-y-6 px-4 pb-8 sm:px-6 lg:px-10">
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.12em] text-abj-text2">Komunita</p>
          <ChatPanel />
        </div>
      </div>
    </section>
  );
}

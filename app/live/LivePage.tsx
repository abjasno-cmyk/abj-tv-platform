"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { LiveChannelGroup } from "@/components/abj/ChannelDirectory";
import type { DayProgram } from "@/lib/epg-types";
import { HomePage } from "@/components/abj/HomePage";
import { useAuth } from "@/components/auth/AuthProvider";
import { trackAnalyticsEvent, trackVideoProgressThrottled } from "@/lib/analytics/client";
import { videoSharePath } from "@/lib/viewer/videoMetadata";

type LivePageProps = {
  epg: DayProgram[];
  initialVideoId: string | null;
  initialTitle: string;
  initialChannelName: string;
  initialStartSeconds?: number;
  // true = lineární „živý" režim (běží nonstop playout smyčka); false = konkrétní
  // VOD video (deep-link / klik) — po dohrání se vrátí na živo.
  initialIsLive?: boolean;
  channels: LiveChannelGroup[];
};

export default function LivePage({
  epg,
  initialVideoId,
  initialTitle,
  initialChannelName,
  initialStartSeconds = 0,
  initialIsLive = true,
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
  // Lineární režim (živý kanál) běží defaultně; konkrétní deep-link video = VOD.
  const [isLive, setIsLive] = useState(() => initialIsLive);
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

  const scrollToPlayer = useCallback(() => {
    const playerElement = document.getElementById("live-player-shell");
    if (!playerElement) return;

    const navHeader = document.querySelector("header");
    const headerOffset = navHeader instanceof HTMLElement ? Math.ceil(navHeader.getBoundingClientRect().height) + 10 : 78;
    const targetTop = Math.max(0, window.scrollY + playerElement.getBoundingClientRect().top - headerOffset);

    window.scrollTo({
      top: targetTop,
      behavior: "smooth",
    });

    // Mobile browsers occasionally ignore the first smooth scroll call after a tap.
    window.setTimeout(() => {
      const remaining = Math.abs(window.scrollY - targetTop);
      if (remaining < 6) return;
      window.scrollTo({
        top: targetTop,
        behavior: "auto",
      });
    }, 240);
  }, []);

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
    if (typeof window === "undefined") return;

    if (isLive || !videoId) {
      if (window.location.pathname.startsWith("/videa/")) {
        window.history.replaceState(null, "", "/live");
      }
      return;
    }

    const nextPath = videoSharePath(videoId);
    if (window.location.pathname !== nextPath) {
      window.history.replaceState(null, "", nextPath);
    }
  }, [isLive, videoId]);

  useEffect(() => {
    linearSourceRef.current.capturedAtMs = Date.now();
    trackAnalyticsEvent({
      event_name: "page_view",
      entity_type: "page",
      entity_id: "live",
      properties: { page: "/live" },
    });
    trackAnalyticsEvent({
      event_name: "live_open",
      entity_type: "live",
      entity_id: initialVideoId ?? "linear",
    });
    if (initialVideoId) {
      trackAnalyticsEvent({
        event_name: "video_start",
        entity_type: "video",
        entity_id: initialVideoId,
        properties: { source: "live_initial" },
      });
    }
  }, [initialVideoId]);

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
          title,
          channelName,
          thumbnailUrl: `https://img.youtube.com/vi/${sample.videoId}/hqdefault.jpg`,
        }),
      });
      trackVideoProgressThrottled({
        videoId: sample.videoId,
        positionSeconds: sample.positionSeconds,
        durationSeconds: sample.durationSeconds,
      });
    },
    [channelName, continueFromSeconds, isAuthenticated, isLive, title, videoId]
  );

  // KOMUNITA blok je nově součástí hero/live-block (viz HomePage), v souladu
  // s klientskou šablonou — žádná samostatná sekce.
  return (
    <section data-ui-version="abj-template-v1" className="min-h-screen bg-[#FFFFFF] text-[#171411]">
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
          trackAnalyticsEvent({
            event_name: "live_open",
            entity_type: "live",
            entity_id: source.videoId ?? "linear",
            properties: { source: "return_to_live" },
          });
        }}
        onContinueFromSaved={(seconds) => {
          setStartSeconds(Math.max(0, Math.floor(seconds)));
          setIsLive(false);
          setContinueFromSeconds(null);
          if (videoId) {
            trackAnalyticsEvent({
              event_name: "resume_video",
              entity_type: "video",
              entity_id: videoId,
              properties: { continue_from_seconds: Math.floor(seconds) },
            });
          }
        }}
        onPlaybackSample={handlePlaybackSample}
        onSelect={(item) => {
          setTitle(item.title);
          setChannelName(item.channelName);
          setVideoId(item.videoId);
          setStartSeconds(0);
          // VOD režim pro testování ovládání a běžná videa; lineární živý proud jen u type=live.
          setIsLive(item.type === "live");
          setContinueFromSeconds(null);
          trackAnalyticsEvent({
            event_name: item.type === "live" ? "live_open" : "video_start",
            entity_type: item.type === "live" ? "live" : "video",
            entity_id: item.videoId ?? undefined,
            properties: { source: "timeline_select" },
          });
        }}
        onSelectChannelVideo={({ channelName: selectedChannelName, video }) => {
          setTitle(video.title);
          setChannelName(selectedChannelName);
          setVideoId(video.videoId);
          setStartSeconds(0);
          setIsLive(false);
          setContinueFromSeconds(null);
          trackAnalyticsEvent({
            event_name: "video_start",
            entity_type: "video",
            entity_id: video.videoId,
            properties: { source: "channel_select", channel_name: selectedChannelName },
          });

          window.requestAnimationFrame(() => {
            scrollToPlayer();
          });
        }}
        engagementSlot={null}
        reactionsSlot={null}
      />
    </section>
  );
}

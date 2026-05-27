"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { LiveChannelGroup } from "@/components/abj/ChannelDirectory";
import type { DayProgram } from "@/lib/epg-types";
import { LiveAlert } from "@/components/abj/LiveAlert";
import { HomePage } from "@/components/abj/HomePage";
import { useAuth } from "@/components/auth/AuthProvider";
import { trackAnalyticsEvent, trackVideoProgressThrottled } from "@/lib/analytics/client";

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

  const scrollToPlayer = () => {
    const playerElement = document.getElementById("live-player-shell");
    if (!playerElement) return;
    playerElement.scrollIntoView({
      behavior: "smooth",
      block: "start",
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
        }),
      });
      trackVideoProgressThrottled({
        videoId: sample.videoId,
        positionSeconds: sample.positionSeconds,
        durationSeconds: sample.durationSeconds,
      });
    },
    [continueFromSeconds, isAuthenticated, isLive, videoId]
  );

  const communityBlock = (
    <section className="relative rounded-[20px] bg-[#ED742F] px-5 pb-8 pt-8 font-[Helvetica,Arial,sans-serif] sm:px-8 sm:pb-10 sm:pt-9">
      <span className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 bg-white px-6 py-1 text-[clamp(1rem,2.5vw,2rem)] font-black uppercase tracking-[0.06em] text-[#111111]">
        COMMUNITY
      </span>
      <div className="mx-auto max-w-[760px] text-center">
        <p className="line-clamp-2 text-[clamp(2rem,4.5vw,3.6rem)] font-black leading-[0.92] text-[#111111]">{title}</p>
      </div>
      <p className="mt-6 text-center text-[clamp(1rem,2.2vw,1.6rem)] font-semibold uppercase tracking-[0.06em] text-white">
        ZDE NAPIŠTE ZPRÁVU
      </p>
      <input
        type="text"
        aria-label="Napsat zprávu do komunity"
        className="mx-auto mt-3 block h-12 w-full max-w-[540px] rounded-[2px] bg-white px-4 py-3 text-base text-[#111111] outline-none"
      />
    </section>
  );

  return (
    <section data-ui-version="abj-geometric-v3" className="min-h-screen bg-[#FFFFFF] text-[#111111]">
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
          setIsLive(item.type === "live" || item.channelName.toLowerCase().includes("abj"));
          setContinueFromSeconds(null);
          trackAnalyticsEvent({
            event_name: item.type === "live" ? "live_open" : "video_start",
            entity_type: item.type === "live" ? "live" : "video",
            entity_id: item.videoId ?? undefined,
            properties: { source: "timeline_select" },
          });
        }}
        onSelectChannelVideo={({ channelName: selectedChannelName, video }) => {
          scrollToPlayer();
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
        }}
        engagementSlot={null}
        reactionsSlot={communityBlock}
      />
      <LiveAlert
        currentVideoId={videoId}
        onWatchLive={({ videoId: liveVideoId, title: liveTitle, channel: liveChannel }) => {
          setVideoId(liveVideoId);
          setTitle(liveTitle);
          setChannelName(liveChannel);
          setStartSeconds(0);
          setIsLive(true);
          setContinueFromSeconds(null);
          linearSourceRef.current = {
            videoId: liveVideoId,
            title: liveTitle,
            channelName: liveChannel,
            startSeconds: 0,
            capturedAtMs: Date.now(),
          };
          trackAnalyticsEvent({
            event_name: "live_open",
            entity_type: "live",
            entity_id: liveVideoId,
            properties: { source: "live_alert" },
          });
        }}
      />
    </section>
  );
}

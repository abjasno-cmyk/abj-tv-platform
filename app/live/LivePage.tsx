"use client";

import { useEffect, useMemo, useState } from "react";

import type { DayProgram, ProgramItem } from "@/lib/epg-types";
import { LiveAlert } from "@/components/abj/LiveAlert";
import { HomePage } from "@/components/abj/HomePage";

type LivePageProps = {
  epg: DayProgram[];
  initialVideoId: string | null;
  initialTitle: string;
  initialChannelName: string;
  initialStartSeconds?: number;
};

type TimelineItemWithBounds = ProgramItem & {
  startMs: number | null;
  endMs: number | null;
};

function parseIsoToMs(value?: string): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function formatRemainingLabel(remainingSeconds: number): string {
  if (remainingSeconds <= 30) return "za chvíli";
  if (remainingSeconds < 60) return "za <1 min";
  if (remainingSeconds < 3600) return `za ${Math.max(1, Math.ceil(remainingSeconds / 60))} min`;
  const hours = Math.floor(remainingSeconds / 3600);
  const minutes = Math.ceil((remainingSeconds % 3600) / 60);
  if (minutes <= 0) return `za ${hours} h`;
  return `za ${hours} h ${minutes} min`;
}

export default function LivePage({
  epg,
  initialVideoId,
  initialTitle,
  initialChannelName,
  initialStartSeconds = 0,
}: LivePageProps) {
  const safeEpg = epg;
  const [videoId, setVideoId] = useState<string | null>(initialVideoId);
  const [title, setTitle] = useState(initialTitle);
  const [channelName, setChannelName] = useState(initialChannelName);
  const [isLive, setIsLive] = useState(() => initialChannelName.toLowerCase().includes("abj"));
  const [startSeconds, setStartSeconds] = useState(() => Math.max(0, Math.floor(initialStartSeconds)));
  const [remainingLabel, setRemainingLabel] = useState("za chvíli");
  const [progressPercent, setProgressPercent] = useState(0);

  const timelineItems = useMemo(() => safeEpg.flatMap((day) => day.items), [safeEpg]);
  const timedTimeline = useMemo<TimelineItemWithBounds[]>(
    () =>
      timelineItems
        .map((item) => {
          const startMs = parseIsoToMs(item.startIso);
          const endMs = parseIsoToMs(item.endIso);
          return { ...item, startMs, endMs };
        })
        .filter((item) => item.startMs !== null && item.endMs !== null && item.endMs > item.startMs)
        .sort((a, b) => (a.startMs ?? 0) - (b.startMs ?? 0)),
    [timelineItems]
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
    if (timedTimeline.length === 0) {
      setRemainingLabel(nextItem ? "za chvíli" : "bez dalšího pořadu");
      setProgressPercent(0);
      return;
    }

    const syncFromTimeline = () => {
      const nowMs = Date.now();
      const current = timedTimeline.find((item) => (item.startMs ?? 0) <= nowMs && nowMs < (item.endMs ?? 0)) ?? null;

      if (!current) {
        const upcoming = timedTimeline.find((item) => (item.startMs ?? 0) > nowMs) ?? null;
        if (upcoming?.startMs) {
          const secondsUntil = Math.max(0, Math.floor((upcoming.startMs - nowMs) / 1000));
          setRemainingLabel(formatRemainingLabel(secondsUntil));
        } else {
          setRemainingLabel("bez dalšího pořadu");
        }
        setProgressPercent(0);
        return;
      }

      setTitle(current.title);
      setChannelName(current.channelName);
      setVideoId(current.videoId ?? null);
      setIsLive(current.type === "live" || current.channelName.toLowerCase().includes("abj"));

      const startMs = current.startMs ?? nowMs;
      const endMs = current.endMs ?? nowMs;
      const elapsedSec = Math.max(0, Math.floor((nowMs - startMs) / 1000));
      const remainingSec = Math.max(0, Math.floor((endMs - nowMs) / 1000));
      const durationMs = Math.max(1, endMs - startMs);
      const progress = Math.max(0, Math.min(100, ((nowMs - startMs) / durationMs) * 100));

      setStartSeconds(elapsedSec);
      setRemainingLabel(formatRemainingLabel(remainingSec));
      setProgressPercent(Math.round(progress));
    };

    syncFromTimeline();
    const timer = setInterval(syncFromTimeline, 1_000);
    return () => clearInterval(timer);
  }, [nextItem, timedTimeline]);

  return (
    <section
      data-ui-version="abj-geometric-v2"
      className="min-h-screen bg-abj-main text-abj-text1"
    >
      <HomePage
        days={safeEpg}
        videoId={videoId}
        title={title}
        channelName={channelName}
        isLive={isLive}
        startSeconds={startSeconds}
        remainingLabel={remainingLabel}
        progressPercent={progressPercent}
        isFiller={isFiller}
        onPlayToggle={() => {
          setIsLive((prev) => !prev);
        }}
        onSelect={(item) => {
          setTitle(item.title);
          setChannelName(item.channelName);
          setVideoId(item.videoId);
          setStartSeconds(0);
          setIsLive(item.type === "live" || item.channelName.toLowerCase().includes("abj"));
        }}
      />
      <LiveAlert
        currentVideoId={videoId}
        onWatchLive={(video) => {
          setVideoId(video);
          setStartSeconds(0);
          setIsLive(true);
        }}
      />
    </section>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";

import type { DayProgram } from "@/lib/epg-types";
import { LiveAlert } from "@/components/abj/LiveAlert";
import { HomePage } from "@/components/abj/HomePage";

type LivePageProps = {
  epg: DayProgram[];
  initialVideoId: string | null;
  initialTitle: string;
  initialChannelName: string;
  initialStartSeconds?: number;
};

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
  const [remainingLabel, setRemainingLabel] = useState("za 12 min");
  const [progressPercent, setProgressPercent] = useState(22);

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

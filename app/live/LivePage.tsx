"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { LiveChannelGroup } from "@/components/abj/ChannelDirectory";
import type { DayProgram } from "@/lib/epg-types";
import { LiveAlert } from "@/components/abj/LiveAlert";
import { HomePage } from "@/components/abj/HomePage";
import { ChatPanel } from "@/components/ChatPanel";
import { WallForVideo } from "@/components/wall/WallForVideo";

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
        onReturnToLive={() => {
          const source = linearSourceRef.current;
          const elapsedSinceLoad =
            source.capturedAtMs > 0 ? Math.max(0, Math.floor((Date.now() - source.capturedAtMs) / 1000)) : 0;
          setVideoId(source.videoId);
          setTitle(source.title);
          setChannelName(source.channelName);
          setStartSeconds(source.startSeconds + elapsedSinceLoad);
          setIsLive(true);
        }}
        onSelect={(item) => {
          setTitle(item.title);
          setChannelName(item.channelName);
          setVideoId(item.videoId);
          setStartSeconds(0);
          setIsLive(item.type === "live" || item.channelName.toLowerCase().includes("abj"));
        }}
        onSelectChannelVideo={({ channelName: selectedChannelName, video }) => {
          setTitle(video.title);
          setChannelName(selectedChannelName);
          setVideoId(video.videoId);
          setStartSeconds(0);
          setIsLive(false);
        }}
        reactionsSlot={videoId ? <WallForVideo videoId={videoId} videoTitle={title} /> : null}
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

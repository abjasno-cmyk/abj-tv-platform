"use client";

import { useEffect, useMemo, useState } from "react";

import type { DayProgram } from "@/lib/epg-types";
import { ABJNav } from "@/components/abj/Nav";
import { VideoHero } from "@/components/abj/VideoHero";
import { NowNextBar } from "@/components/abj/NowNextBar";
import { Timeline } from "@/components/abj/Timeline";
import { Hospoda } from "@/components/abj/Hospoda";

type LivePageProps = {
  epg: DayProgram[];
  initialVideoId: string | null;
  initialTitle: string;
  initialChannelName: string;
};

export default function LivePage({
  epg,
  initialVideoId,
  initialTitle,
  initialChannelName,
}: LivePageProps) {
  const safeEpg = epg;
  const [videoId, setVideoId] = useState<string | null>(initialVideoId);
  const [title, setTitle] = useState(initialTitle);
  const [channelName, setChannelName] = useState(initialChannelName);
  const [isLive, setIsLive] = useState(() => initialChannelName.toLowerCase().includes("abj"));
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
  const nowItem = selectedIndex >= 0 ? timelineItems[selectedIndex] : timelineItems[0] ?? null;
  const nextItem =
    selectedIndex >= 0
      ? timelineItems[selectedIndex + 1] ?? null
      : timelineItems.length > 1
        ? timelineItems[1]
        : null;
  const nowNextWindow = useMemo(() => {
    const base = new Date();
    const plus25 = new Date(base.getTime() + 25 * 60_000);
    const plus55 = new Date(base.getTime() + 55 * 60_000);
    return {
      nowStartIso: base.toISOString(),
      nowEndIso: plus25.toISOString(),
      nextStartIso: plus25.toISOString(),
      nextEndIso: plus55.toISOString(),
    };
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
    <section className="min-h-screen bg-abj-main text-abj-text1">
      <ABJNav />
      <div className="flex h-[calc(100vh-46px)] overflow-hidden">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="px-5 pt-5">
            <VideoHero
              title={title}
              channel={channelName || "ABJ Síť"}
              isLive={isLive}
              remainingLabel={remainingLabel}
              progressPercent={progressPercent}
              onPlayToggle={() => {
                setIsLive((prev) => !prev);
              }}
            />
          </div>
          <NowNextBar
            nowItem={
              nowItem
                ? {
                    title: nowItem.title,
                    start: nowNextWindow.nowStartIso,
                    end: nowNextWindow.nowEndIso,
                  }
                : null
            }
            nextItem={
              nextItem
                ? {
                    title: nextItem.title,
                    start: nowNextWindow.nextStartIso,
                    end: nowNextWindow.nextEndIso,
                  }
                : null
            }
          />
          <Timeline
            days={safeEpg}
            onSelect={(item) => {
              setTitle(item.title);
              setChannelName(item.channelName);
              setVideoId(item.videoId);
              setIsLive(item.type === "live" || item.channelName.toLowerCase().includes("abj"));
            }}
          />
        </div>
        <Hospoda />
      </div>
    </section>
  );
}

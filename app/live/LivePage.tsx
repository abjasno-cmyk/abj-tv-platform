"use client";

import { useMemo, useState } from "react";

import type { DayProgram } from "@/lib/epg-types";
import { LiveNowPanel } from "@/components/live/LiveNowPanel";
import { LiveTimeline } from "@/components/live/LiveTimeline";
import { LiveVideoPlayer } from "@/components/live/LiveVideoPlayer";

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
  const safeEpg = useMemo(
    () =>
      epg.length > 0
        ? epg
        : [
            {
              date: "fallback",
              label: "Dnes",
              items: [
                {
                  time: "12:00",
                  title: "ABJ Live Studio",
                  channelName: "ABJ Síť",
                  thumbnail: null,
                  videoId: initialVideoId,
                  isABJ: true,
                  type: "live" as const,
                },
                {
                  time: "13:00",
                  title: "Analýza dne",
                  channelName: "ABJ Síť",
                  thumbnail: null,
                  videoId: initialVideoId,
                  isABJ: true,
                  type: "upcoming" as const,
                },
              ],
            },
          ],
    [epg, initialVideoId]
  );
  const [videoId, setVideoId] = useState<string | null>(initialVideoId);
  const [title, setTitle] = useState(initialTitle);
  const [channelName, setChannelName] = useState(initialChannelName);
  const startSeconds = Math.max(0, Math.floor(initialStartSeconds));
  const timelineItems = useMemo(() => safeEpg.flatMap((day) => day.items), [safeEpg]);
  const [viewerSeed] = useState(() => Math.floor(Math.random() * 900));
  const realViewers = useMemo(() => Math.max(1200, timelineItems.length * 70 + viewerSeed), [timelineItems.length, viewerSeed]);

  return (
    <section className="min-h-[calc(100vh-46px)] bg-[var(--bg)] px-5 py-5 text-abj-text1">
      <div className="mx-auto max-w-[1700px] space-y-4">
        <header className="space-y-1">
          <p className="text-[11px] uppercase tracking-[0.14em] text-abj-text2">ABJ vysílání 24/7</p>
          <h1 className="text-2xl font-semibold text-abj-text1">Live přehled</h1>
        </header>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,7fr)_minmax(320px,3fr)]">
          <div className="space-y-4">
            <LiveVideoPlayer videoId={videoId} title={title} startSeconds={startSeconds} realViewers={realViewers} />
            <div className="rounded-xl border border-[var(--abj-gold-dim)] bg-[var(--card)] p-4">
              <p className="text-xs uppercase tracking-[0.1em] text-abj-text2">Nyní sleduješ</p>
              <h2 className="mt-1 text-xl font-semibold text-abj-text1">{title || "Čekáme na signál"}</h2>
              <p className="mt-1 text-sm text-abj-text2">{channelName || "ABJ Síť"}</p>
            </div>
          </div>

          <LiveNowPanel
            items={timelineItems}
            currentVideoId={videoId}
            onPlayPrevious={(item) => {
              setTitle(item.title);
              setChannelName(item.channelName);
              setVideoId(item.videoId);
            }}
          />
        </div>

        <LiveTimeline
          items={timelineItems}
          currentVideoId={videoId}
          onSeekToItem={(item) => {
            setTitle(item.title);
            setChannelName(item.channelName);
            setVideoId(item.videoId);
          }}
        />
      </div>
    </section>
  );
}

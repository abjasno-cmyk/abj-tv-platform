"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ProgramItem, DayProgram } from "@/lib/epg-types";
import { ABJNav } from "@/components/abj/Nav";
import { VideoHero } from "@/components/abj/VideoHero";
import { LiveAlert } from "@/components/abj/LiveAlert";
import { NowNextBar } from "@/components/abj/NowNextBar";
import { Timeline } from "@/components/abj/Timeline";
import { HybridChatPanel } from "@/components/hybrid-chat/HybridChatPanel";
import { UnderrunOverlayPlayer } from "@/components/live/UnderrunOverlayPlayer";
import type { GapFillItem } from "@/lib/underrunProtection";
import { fetchGapFillPlan, fetchSafetyBridge, readFeedApiKeyFromClientEnv } from "@/lib/underrunProtection";

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
  const [activeFiller, setActiveFiller] = useState<GapFillItem | null>(null);
  const fillerDoneRef = useRef<(() => void) | null>(null);
  const fillerFailRef = useRef<((error?: unknown) => void) | null>(null);
  const handleFillerFinished = useCallback(() => {
    fillerDoneRef.current?.();
  }, []);
  const handleFillerError = useCallback((error?: unknown) => {
    fillerFailRef.current?.(error);
  }, []);

  const timelineItems = useMemo(
    () => safeEpg.flatMap((day) => day.items),
    [safeEpg]
  );
  const selectedIndex = useMemo(
    () => timelineItems.findIndex((item) => item.videoId === videoId),
    [timelineItems, videoId]
  );
  const nowItem = selectedIndex >= 0 ? timelineItems[selectedIndex] : timelineItems[0] ?? null;
  const previousItem = selectedIndex > 0 ? timelineItems[selectedIndex - 1] : null;
  const nextItem =
    selectedIndex >= 0
      ? timelineItems[selectedIndex + 1] ?? null
      : timelineItems.length > 1
        ? timelineItems[1]
        : null;
  const nowNextWindow = useMemo(() => {
    const base = new Date();
    const minus25 = new Date(base.getTime() - 25 * 60_000);
    const plus25 = new Date(base.getTime() + 25 * 60_000);
    const plus55 = new Date(base.getTime() + 55 * 60_000);
    return {
      previousStartIso: minus25.toISOString(),
      previousEndIso: base.toISOString(),
      nowStartIso: base.toISOString(),
      nowEndIso: plus25.toISOString(),
      nextStartIso: plus25.toISOString(),
      nextEndIso: plus55.toISOString(),
    };
  }, []);
  const feedApiKey = useMemo(() => readFeedApiKeyFromClientEnv(), []);

  const toBlockRef = useCallback(
    (item: ProgramItem, role: "current" | "next") => ({
      block_id: item.videoId ?? `${role}-${item.time}-${item.title}`,
      starts_at:
        item.startIso ??
        (role === "next" ? new Date(Date.now() + 60_000).toISOString() : new Date().toISOString()),
      video_id: item.videoId,
      title: item.title,
      channelName: item.channelName,
      type: item.type,
    }),
    []
  );

  const playBlock = useCallback((block: {
    video_id: string | null;
    title: string;
    channelName: string;
    type?: "upcoming" | "vod" | "live" | "override";
  }) => {
    setTitle(block.title);
    setChannelName(block.channelName);
    setVideoId(block.video_id);
    setStartSeconds(0);
    setIsLive(block.type === "live" || block.channelName.toLowerCase().includes("abj"));
  }, []);

  const playFiller = useCallback((filler: GapFillItem): Promise<void> => {
    return new Promise((resolve, reject) => {
      fillerDoneRef.current = () => {
        fillerDoneRef.current = null;
        fillerFailRef.current = null;
        setActiveFiller(null);
        resolve();
      };
      fillerFailRef.current = (error?: unknown) => {
        fillerDoneRef.current = null;
        fillerFailRef.current = null;
        setActiveFiller(null);
        reject(error ?? new Error("filler-playback-error"));
      };
      setActiveFiller(filler);
    });
  }, []);

  const playLocalFallback = useCallback(async () => {
    console.error("FALLBACK_LOOP_STARTED");
    await playFiller({
      type: "boundary",
      duration_sec: 60,
      title: "Nouzová ABJ smyčka",
      purpose: "local_fallback_loop",
    });
  }, [playFiller]);

  const onVideoEnded = useCallback(async (currentBlock?: ProgramItem | null, nextFixedBlock?: ProgramItem | null) => {
    const sourceCurrent = currentBlock ?? nowItem;
    const sourceNext = nextFixedBlock ?? nextItem;
    const current = sourceCurrent ? toBlockRef(sourceCurrent, "current") : null;
    const next = sourceNext ? toBlockRef(sourceNext, "next") : null;
    if (!current || !next) return;

    const executeUnderrun = async (): Promise<void> => {
      const now = Date.now();
      const remainingSec = Math.max(0, Math.floor((Date.parse(next.starts_at) - now) / 1000));
      if (remainingSec <= 0) {
        playBlock(next);
        return;
      }

      try {
        const plan = await fetchGapFillPlan({
          seconds: remainingSec,
          currentBlockId: current.block_id,
          nextBlockId: next.block_id,
          apiKey: feedApiKey,
        });
        const fillers = Array.isArray(plan.fillers) ? plan.fillers : [];
        for (const filler of fillers) {
          await playFiller(filler);
        }
      } catch (error) {
        console.error("fill-gap selhalo, jedu safety-bridge", error);
        try {
          const safety = await fetchSafetyBridge(feedApiKey);
          await playFiller(safety.block);
          return executeUnderrun();
        } catch (safetyError) {
          console.error("safety-bridge selhalo, jedu local fallback", safetyError);
          await playLocalFallback();
          return executeUnderrun();
        }
      }
      playBlock(next);
    };

    await executeUnderrun();
  }, [feedApiKey, nextItem, nowItem, playBlock, playFiller, playLocalFallback, toBlockRef]);

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
      <ABJNav
        nowPlaying={
          nowItem
            ? {
                channel: nowItem.channelName || "ABJ Síť",
                title: nowItem.title,
              }
            : null
        }
      />
      <div className="flex h-[calc(100vh-46px)] overflow-hidden">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="px-5 pt-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-abj-text2">ABJ vysílání 24/7</p>
          </div>
          <div className="relative px-5 pt-5">
            <VideoHero
              key={`${videoId ?? "no-video"}-${startSeconds}`}
              videoId={videoId}
              title={title}
              channel={channelName || "ABJ Síť"}
              isLive={isLive}
              startSeconds={startSeconds}
              remainingLabel={remainingLabel}
              progressPercent={progressPercent}
              onPlayToggle={() => {
                setIsLive((prev) => !prev);
              }}
              onVideoEnded={() => {
                void onVideoEnded(nowItem, nextItem);
              }}
            />
            <UnderrunOverlayPlayer
              filler={activeFiller}
              onFinished={handleFillerFinished}
              onError={handleFillerError}
            />
          </div>
          <LiveAlert
            currentVideoId={videoId}
            onWatchLive={(video) => {
              setVideoId(video);
              setStartSeconds(0);
              setIsLive(true);
            }}
          />
          <NowNextBar
            previousItem={
              previousItem
                ? {
                    title: previousItem.title,
                    start: nowNextWindow.previousStartIso,
                    end: nowNextWindow.previousEndIso,
                  }
                : null
            }
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
              setStartSeconds(0);
              setIsLive(item.type === "live" || item.channelName.toLowerCase().includes("abj"));
            }}
          />
        </div>
        <HybridChatPanel />
      </div>
    </section>
  );
}

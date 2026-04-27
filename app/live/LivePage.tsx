"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ProgramItem, DayProgram } from "@/lib/epg-types";
import { LiveAlert } from "@/components/abj/LiveAlert";
import { ABJNav } from "@/components/abj/Nav";
import { HybridChatPanel } from "@/components/hybrid-chat/HybridChatPanel";
import { UnderrunOverlayPlayer } from "@/components/live/UnderrunOverlayPlayer";
import { LiveStrip } from "@/components/live/LiveStrip";
import { VideoPlayer as MobileFirstVideoPlayer } from "@/components/live/VideoPlayer";
import { Timeline as MobileFirstTimeline } from "@/components/live/Timeline";
import { WhatItMeansCard } from "@/components/live/WhatItMeansCard";
import { QuickActions } from "@/components/live/QuickActions";
import {
  LiveStateProvider,
  useLiveState,
  type LiveSegment,
  type TimelineSegment,
} from "@/components/live/LiveState";
import type { GapFillItem } from "@/lib/underrunProtection";
import { fetchGapFillPlan, fetchSafetyBridge, readFeedApiKeyFromClientEnv } from "@/lib/underrunProtection";

type LivePageProps = {
  epg: DayProgram[];
  initialVideoId: string | null;
  initialTitle: string;
  initialChannelName: string;
  initialStartSeconds?: number;
};

function getTimelineSegmentId(item: ProgramItem): string {
  return item.videoId ?? `${item.time}-${item.title}`;
}

export default function LivePage({
  epg,
  initialVideoId,
  initialTitle,
  initialChannelName,
  initialStartSeconds = 0,
}: LivePageProps) {
  return (
    <LiveStateProvider>
      <LivePageContent
        epg={epg}
        initialVideoId={initialVideoId}
        initialTitle={initialTitle}
        initialChannelName={initialChannelName}
        initialStartSeconds={initialStartSeconds}
      />
    </LiveStateProvider>
  );
}

function mapProgramItemToTimelineSegment(item: ProgramItem, index: number): TimelineSegment {
  return {
    id: getTimelineSegmentId(item),
    title: item.title,
    duration: item.type === "live" ? "75 min" : item.type === "upcoming" ? "30 min" : "25 min",
    start_time: item.time,
    explanation:
      item.type === "live"
        ? "Živé vysílání s přímým vstupem."
        : item.type === "upcoming"
          ? "Následující premiérový blok."
          : "Kurátorovaný záznam s kontextem.",
    phase: "later",
    videoId: item.videoId,
  };
}

function mapProgramItemToLiveSegment(item: ProgramItem): LiveSegment {
  return {
    id: item.videoId ?? `${item.time}-${item.title}`,
    title: item.title,
    channel: item.channelName,
    videoId: item.videoId,
    start_time: item.time,
    duration: item.type === "live" ? "75 min" : item.type === "upcoming" ? "30 min" : "25 min",
  };
}

function getInterpretationCopy(
  nowItem: ProgramItem | null,
  nextItem: ProgramItem | null
): { summary: string; whyItMatters: string; impact: string } {
  const nowTitle = nowItem?.title ?? "aktuální vysílání";
  const nextTitle = nextItem?.title ?? "následující blok";
  return {
    summary: `Právě sledujete segment „${nowTitle}“, který rámuje dnešní hlavní osu vysílání. Redakce průběžně filtruje klíčové body tak, aby byla orientace okamžitá i na mobilu.`,
    whyItMatters: `Navazující část „${nextTitle}“ posune téma o další vrstvu kontextu a udrží kontinuitu bez hluchého místa. Divák tak ví, co se děje teď a proč má smysl zůstat i v přechodu.`,
    impact: "Dopad: vyšší důvěra v tok vysílání, delší watch-time a méně odchodů při změně segmentu.",
  };
}

function LivePageContent({
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
  const [fallbackNextStart] = useState(() => Date.now() + 10 * 60_000);
  const [activeFiller, setActiveFiller] = useState<GapFillItem | null>(null);
  const fillerDoneRef = useRef<(() => void) | null>(null);
  const fillerFailRef = useRef<((error?: unknown) => void) | null>(null);
  const handleFillerFinished = useCallback(() => {
    fillerDoneRef.current?.();
  }, []);
  const handleFillerError = useCallback((error?: unknown) => {
    fillerFailRef.current?.(error);
  }, []);
  const {
    liveState,
    setCurrentSegment,
    setNextSegment,
    setTimeline,
    setViewersCount,
  } = useLiveState();

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
  const laterItems = useMemo(() => {
    if (selectedIndex >= 0) {
      return timelineItems.slice(selectedIndex + 2, selectedIndex + 8);
    }
    return timelineItems.slice(2, 8);
  }, [selectedIndex, timelineItems]);
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
  const currentSegment = useMemo(
    () => (nowItem ? mapProgramItemToLiveSegment(nowItem) : null),
    [nowItem]
  );
  const nextSegment = useMemo(
    () => (nextItem ? mapProgramItemToLiveSegment(nextItem) : null),
    [nextItem]
  );

  useEffect(() => {
    const mergedTimeline: TimelineSegment[] = [];
    if (nowItem) {
      mergedTimeline.push({
        ...mapProgramItemToTimelineSegment(nowItem, 0),
        phase: "now",
      });
    }
    if (nextItem) {
      mergedTimeline.push({
        ...mapProgramItemToTimelineSegment(nextItem, 1),
        phase: "next",
      });
    }
    laterItems.forEach((item, idx) => {
      mergedTimeline.push({
        ...mapProgramItemToTimelineSegment(item, idx + 2),
        phase: "later",
      });
    });
    setTimeline(mergedTimeline);
    setCurrentSegment(currentSegment);
    setNextSegment(nextSegment);
  }, [
    currentSegment,
    laterItems,
    nextSegment,
    nextItem,
    nowItem,
    setCurrentSegment,
    setNextSegment,
    setTimeline,
  ]);

  useEffect(() => {
    const seed = (videoId?.length ?? 7) * 137;
    const updateViewers = () => {
      const swing = Math.floor(Math.abs(Math.sin(Date.now() / 45_000)) * 220);
      setViewersCount(100 + ((seed + swing) % 800));
    };
    updateViewers();
    const timer = setInterval(updateViewers, 15_000);
    return () => clearInterval(timer);
  }, [setViewersCount, videoId]);

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

  const progressNormalized = useMemo(
    () => Math.max(0, Math.min(1, progressPercent / 100)),
    [progressPercent]
  );

  const nextStartTimestamp = useMemo(() => {
    if (!nextItem?.startIso) return fallbackNextStart;
    const ts = Date.parse(nextItem.startIso);
    return Number.isFinite(ts) ? ts : fallbackNextStart;
  }, [fallbackNextStart, nextItem]);

  const activeVideoUrl = useMemo(() => {
    if (!videoId) return null;
    return `https://www.youtube.com/watch?v=${videoId}`;
  }, [videoId]);
  const interpretationCopy = useMemo(
    () => getInterpretationCopy(nowItem, nextItem),
    [nowItem, nextItem]
  );

  const preloadNextSegment = useCallback(() => {
    if (!nextItem?.videoId || typeof document === "undefined") return;
    const link = document.createElement("link");
    link.rel = "preconnect";
    link.href = "https://www.youtube.com";
    document.head.appendChild(link);
    const image = new Image();
    image.src = `https://i.ytimg.com/vi/${nextItem.videoId}/hqdefault.jpg`;
  }, [nextItem]);

  useEffect(() => {
    preloadNextSegment();
  }, [preloadNextSegment]);

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
      <LiveStrip viewers={liveState.viewers_count} headline={title} />
      <div className="flex min-h-[calc(100vh-46px)] overflow-hidden">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="px-4 pt-4 md:px-5">
            <p className="text-[11px] uppercase tracking-[0.14em] text-abj-text2">ABJ vysílání 24/7</p>
          </div>
          <div className="relative px-4 pb-3 pt-3 md:px-5">
            <MobileFirstVideoPlayer
              videoUrl={activeVideoUrl}
              title={title}
              progress={progressNormalized}
              nextStartTimestamp={nextStartTimestamp}
              onEnded={() => {
                void onVideoEnded(nowItem, nextItem);
              }}
            />
            <UnderrunOverlayPlayer
              filler={activeFiller}
              onFinished={handleFillerFinished}
              onError={handleFillerError}
            />
          </div>
          <div className="px-4 pb-3 md:px-5">
            <MobileFirstTimeline
              items={liveState.timeline}
              onJump={(segment) => {
                const target = timelineItems.find(
                  (item) => getTimelineSegmentId(item) === segment.id
                );
                if (!target) return;
                setTitle(target.title);
                setChannelName(target.channelName);
                setVideoId(target.videoId);
                setStartSeconds(0);
                setIsLive(target.type === "live" || target.channelName.toLowerCase().includes("abj"));
              }}
            />
          </div>
          <div className="grid gap-3 px-4 pb-3 md:grid-cols-2 md:px-5">
            <WhatItMeansCard
              headline="Co to znamená právě teď"
              summary={interpretationCopy.summary}
              whyItMatters={interpretationCopy.whyItMatters}
              impact={interpretationCopy.impact}
            />
            <QuickActions
              onNextTopic={() => {
                if (!nextItem) return;
                setTitle(nextItem.title);
                setChannelName(nextItem.channelName);
                setVideoId(nextItem.videoId);
                setStartSeconds(0);
                setIsLive(nextItem.type === "live" || nextItem.channelName.toLowerCase().includes("abj"));
              }}
              onStayOnTopic={() => {
                setStartSeconds((prev) => Math.max(0, prev - 15));
              }}
              onShowContext={() => {
                if (!videoId) return;
                window.location.href = `/videos?videoId=${encodeURIComponent(videoId)}`;
              }}
            />
          </div>
          <details className="mx-4 mb-4 rounded-xl border border-[#1A3352] bg-[#071321] md:mx-5">
            <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-[#B8CBE0]">
              Pokročilé panely (legacy)
            </summary>
            <div className="space-y-3 px-4 pb-4">
              <LiveAlert
                currentVideoId={videoId}
                onWatchLive={(video) => {
                  setVideoId(video);
                  setStartSeconds(0);
                  setIsLive(true);
                }}
              />
            </div>
          </details>
        </div>
        <HybridChatPanel />
      </div>
    </section>
  );
}

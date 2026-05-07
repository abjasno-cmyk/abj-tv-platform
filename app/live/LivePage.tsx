"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ProgramItem, DayProgram } from "@/lib/epg-types";
import { LiveAlert } from "@/components/abj/LiveAlert";
import { HybridChatPanel } from "@/components/hybrid-chat/HybridChatPanel";
import { UnderrunOverlayPlayer } from "@/components/live/UnderrunOverlayPlayer";
import { LiveStrip } from "@/components/live/LiveStrip";
import { VideoPlayer as MobileFirstVideoPlayer } from "@/components/live/VideoPlayer";
import { Timeline as MobileFirstTimeline } from "@/components/live/Timeline";
import { WhatItMeansCard } from "@/components/live/WhatItMeansCard";
import { QuickActions } from "@/components/live/QuickActions";
import { RecommendedStrip } from "@/components/live/RecommendedStrip";
import {
  LiveStateProvider,
  useLiveState,
  type LiveSegment,
  type TimelineSegment,
} from "@/components/live/LiveState";
import type { GapFillItem } from "@/lib/underrunProtection";
import { fetchGapFillPlan, fetchSafetyBridge, readFeedApiKeyFromClientEnv } from "@/lib/underrunProtection";
import { fetchLiveRuntime, type LiveRuntimeResponse, type RecommendedVideo } from "@/lib/liveRuntime";

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

function parseIsoMs(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toProgramItemFromRuntimeBlock(block: NonNullable<LiveRuntimeResponse["block"]>): ProgramItem {
  const startMs = parseIsoMs(block.startedAt);
  const nowMs = Date.now();
  const type: ProgramItem["type"] = nowMs >= startMs ? "live" : "upcoming";
  return {
    time: block.startedAt,
    title: block.title,
    channelName: block.channel || "ABJ TV",
    thumbnail: null,
    videoId: block.videoId,
    isABJ: (block.channel || "").toLowerCase().includes("abj"),
    type,
    startIso: block.startedAt,
    endIso: block.endsAt,
  };
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
    setMode,
    setOnDemandVideo,
  } = useLiveState();
  const mode = liveState.mode;
  const onDemandVideo = liveState.onDemandVideo;
  const [runtimeRecommended, setRuntimeRecommended] = useState<RecommendedVideo[] | undefined>(undefined);
  const [runtimeBlockEndsAt, setRuntimeBlockEndsAt] = useState<string | null>(null);
  const [runtimeLoading, setRuntimeLoading] = useState(true);
  const [returnOverlayStep, setReturnOverlayStep] = useState<number | null>(null);
  const onDemandStartedAtRef = useRef<number | null>(null);
  const runtimePrefetchRef = useRef<LiveRuntimeResponse | null>(null);
  const runtimeRefreshTimerRef = useRef<number | null>(null);
  const returnOverlayTimerRef = useRef<number | null>(null);
  const staleRecoveryTimerRef = useRef<number | null>(null);

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

  const applyRuntimeToLive = useCallback(
    (runtime: LiveRuntimeResponse) => {
      setRuntimeRecommended(runtime.recommended);
      setRuntimeBlockEndsAt(runtime.block?.endsAt ?? null);

      if (runtime.block) {
        const mapped = toProgramItemFromRuntimeBlock(runtime.block);
        playBlock({
          video_id: mapped.videoId,
          title: mapped.title,
          channelName: mapped.channelName,
          type: mapped.type,
        });
        return;
      }

      if (Array.isArray(runtime.recommended) && runtime.recommended.length > 0) {
        const fallback = runtime.recommended[0];
        onDemandStartedAtRef.current = Date.now();
        setMode("on_demand");
        setOnDemandVideo(fallback);
        console.info("[escape] open", { id: fallback.id, reason: fallback.reason });
      }
    },
    [playBlock, setMode, setOnDemandVideo]
  );

  const fetchRuntimeAndApply = useCallback(
    async (options?: { applyBlock?: boolean; signal?: AbortSignal }): Promise<LiveRuntimeResponse | null> => {
      try {
        const runtime = await fetchLiveRuntime({ signal: options?.signal });
        setRuntimeRecommended(runtime.recommended);
        setRuntimeBlockEndsAt(runtime.block?.endsAt ?? null);
        if (options?.applyBlock) {
          applyRuntimeToLive(runtime);
        }
        return runtime;
      } catch (error) {
        console.error("live-runtime-fetch-failed", error);
        return null;
      } finally {
        setRuntimeLoading(false);
      }
    },
    [applyRuntimeToLive]
  );

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    void fetchRuntimeAndApply({ applyBlock: false, signal: controller.signal }).then((runtime) => {
      if (cancelled || !runtime) return;
      if (runtime.block === null && Array.isArray(runtime.recommended) && runtime.recommended.length > 0) {
        const fallback = runtime.recommended[0];
        onDemandStartedAtRef.current = Date.now();
        setMode("on_demand");
        setOnDemandVideo(fallback);
        console.info("[escape] open", { id: fallback.id, reason: fallback.reason });
      }
    });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [fetchRuntimeAndApply, setMode, setOnDemandVideo]);

  useEffect(() => {
    return () => {
      if (runtimeRefreshTimerRef.current !== null) {
        window.clearTimeout(runtimeRefreshTimerRef.current);
      }
      if (returnOverlayTimerRef.current !== null) {
        window.clearTimeout(returnOverlayTimerRef.current);
      }
      if (staleRecoveryTimerRef.current !== null) {
        window.clearTimeout(staleRecoveryTimerRef.current);
      }
    };
  }, []);

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
    if (mode === "on_demand") {
      setReturnOverlayStep(3);
      const countdown = (step: number) => {
        setReturnOverlayStep(step);
        if (step <= 1) {
          const completeReturn = async () => {
            setMode("live");
            setOnDemandVideo(null);
            const elapsedSec = onDemandStartedAtRef.current
              ? Math.max(0, Math.floor((Date.now() - onDemandStartedAtRef.current) / 1000))
              : 0;
            console.info("[escape] return", { afterSec: elapsedSec });
            onDemandStartedAtRef.current = null;
            const runtime = runtimePrefetchRef.current ?? (await fetchRuntimeAndApply({ applyBlock: true }));
            runtimePrefetchRef.current = null;
            if (!runtime) {
              if (staleRecoveryTimerRef.current !== null) window.clearTimeout(staleRecoveryTimerRef.current);
              staleRecoveryTimerRef.current = window.setTimeout(() => {
                void fetchRuntimeAndApply({ applyBlock: true });
              }, 1000);
            }
            setReturnOverlayStep(null);
          };
          void completeReturn();
          return;
        }
        returnOverlayTimerRef.current = window.setTimeout(() => countdown(step - 1), 1000);
      };
      countdown(3);
      return;
    }

    const sourceCurrent = currentBlock ?? nowItem;
    const sourceNext = nextFixedBlock ?? nextItem;
    const current = sourceCurrent ? toBlockRef(sourceCurrent, "current") : null;
    const next = sourceNext ? toBlockRef(sourceNext, "next") : null;
    if (!current || !next) {
      await fetchRuntimeAndApply({ applyBlock: true });
      return;
    }

    const executeUnderrun = async (): Promise<void> => {
      const now = Date.now();
      const remainingSec = Math.max(0, Math.floor((Date.parse(next.starts_at) - now) / 1000));
      if (remainingSec <= 0) {
        const refreshed = await fetchRuntimeAndApply({ applyBlock: true });
        if (!refreshed?.block) {
          playBlock(next);
        }
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
  }, [
    feedApiKey,
    fetchRuntimeAndApply,
    mode,
    nextItem,
    nowItem,
    playBlock,
    playFiller,
    playLocalFallback,
    setMode,
    setOnDemandVideo,
    toBlockRef,
  ]);

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
    if (mode === "on_demand") {
      return onDemandVideo?.videoUrl ?? null;
    }
    if (!videoId) return null;
    return `https://www.youtube.com/watch?v=${videoId}`;
  }, [mode, onDemandVideo, videoId]);
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

  useEffect(() => {
    if (mode !== "on_demand" || !onDemandVideo?.durationSec) return;
    const prefetchDelay = Math.max(0, (onDemandVideo.durationSec - 5) * 1000);
    if (runtimeRefreshTimerRef.current !== null) {
      window.clearTimeout(runtimeRefreshTimerRef.current);
    }
    runtimeRefreshTimerRef.current = window.setTimeout(() => {
      void fetchRuntimeAndApply({ applyBlock: false }).then((runtime) => {
        runtimePrefetchRef.current = runtime;
      });
    }, prefetchDelay);
    return () => {
      if (runtimeRefreshTimerRef.current !== null) {
        window.clearTimeout(runtimeRefreshTimerRef.current);
      }
    };
  }, [fetchRuntimeAndApply, mode, onDemandVideo]);

  const handleRecommendedSelect = useCallback(
    (video: RecommendedVideo) => {
      setMode("on_demand");
      setOnDemandVideo(video);
      onDemandStartedAtRef.current = Date.now();
      console.info("[escape] open", { id: video.id, reason: video.reason });
    },
    [setMode, setOnDemandVideo]
  );

  const shouldRenderRecommendedStrip =
    runtimeRecommended !== undefined && Array.isArray(runtimeRecommended) && runtimeRecommended.length === 3;

  useEffect(() => {
    if (mode !== "live") return;
    if (!runtimeBlockEndsAt) return;
    const now = Date.now();
    const endsAt = Date.parse(runtimeBlockEndsAt);
    if (!Number.isFinite(endsAt)) return;
    if (endsAt < now) {
      void fetchRuntimeAndApply({ applyBlock: true });
    }
  }, [fetchRuntimeAndApply, mode, runtimeBlockEndsAt]);

  return (
    <section className="h-[calc(100vh-46px)] overflow-hidden bg-abj-main text-abj-text1">
      <LiveStrip viewers={liveState.viewers_count} headline={title} />
      <div className="flex h-[calc(100vh-102px)] min-h-0 overflow-hidden">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
          <div className="px-4 pt-2 md:px-5">
            <p className="text-[10px] uppercase tracking-[0.14em] text-abj-text2">ABJ vysílání 24/7</p>
          </div>
          <div className="relative px-3 pb-2 pt-2 md:px-5">
            <MobileFirstVideoPlayer
              videoUrl={activeVideoUrl}
              title={title}
              progress={progressNormalized}
              nextStartTimestamp={nextStartTimestamp}
              compact
              showLiveUi={mode === "live"}
              cornerBadgeText={mode === "on_demand" ? "Sledujete výběr" : null}
              onEnded={() => {
                void onVideoEnded(nowItem, nextItem);
              }}
            />
            {returnOverlayStep !== null ? (
              <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-[#040B16]/88">
                <div className="rounded-xl border border-[#3D5F87] bg-[#0A1D34]/90 px-6 py-5 text-center shadow-[0_16px_42px_rgba(0,0,0,0.45)]">
                  <p className="text-sm font-semibold text-[#DCEBFF]">Vracíme vás do živého vysílání</p>
                  <p className="mt-2 text-4xl font-bold text-white">{returnOverlayStep}</p>
                </div>
              </div>
            ) : null}
            <UnderrunOverlayPlayer
              filler={activeFiller}
              onFinished={handleFillerFinished}
              onError={handleFillerError}
            />
          </div>
          <div className="px-3 pb-2 md:px-5">
            {runtimeLoading || shouldRenderRecommendedStrip ? (
              <div className="min-h-[170px]">
                {shouldRenderRecommendedStrip ? (
                  <RecommendedStrip items={runtimeRecommended ?? []} onSelect={handleRecommendedSelect} />
                ) : null}
              </div>
            ) : null}
          </div>
          {mode === "live" ? (
            <>
              <div className="px-3 pb-2 md:px-5">
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
              <div className="grid gap-2 px-3 pb-2 md:grid-cols-[minmax(0,1fr)_320px] md:px-5">
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
            </>
          ) : null}
          <details className="mx-4 mb-3 hidden rounded-xl border border-[#1A3352] bg-[#071321] md:mx-5 2xl:block">
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

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { DayProgram } from "@/lib/epg-types";
import { VideoHero } from "@/components/abj/VideoHero";
import { LiveAlert } from "@/components/abj/LiveAlert";
import { NowNextBar } from "@/components/abj/NowNextBar";
import { Timeline } from "@/components/abj/Timeline";
import { Hospoda } from "@/components/abj/Hospoda";

type LivePageProps = {
  epg: DayProgram[];
  initialVideoId: string | null;
  initialTitle: string;
  initialChannelName: string;
  initialStartSeconds?: number;
};

type ExternalProgramBlock = {
  blockId: string | null;
  startsAt: string;
  endsAt: string;
  expectedEndsAt: string | null;
  videoDurationSec: number | null;
  videoId: string | null;
  title: string;
  channel: string;
};

const NOW_REFRESH_INTERVAL_MS = 60_000;
const END_TRIGGER_DEDUP_MS = 1_500;
const MAX_TIMEOUT_MS = 2_147_483_647;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function parseDateMs(value: string | null): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseProgramBlock(value: unknown): ExternalProgramBlock | null {
  const row = asRecord(value);
  if (!row) return null;

  const startsAt = readString(row.starts_at) ?? readString(row.start) ?? readString(row.startIso);
  const endsAt = readString(row.ends_at) ?? readString(row.end) ?? readString(row.endIso);
  if (!startsAt || !endsAt) return null;

  const startMs = parseDateMs(startsAt);
  const endMs = parseDateMs(endsAt);
  if (startMs === null || endMs === null || endMs <= startMs) return null;

  return {
    blockId: readString(row.block_id) ?? readString(row.id),
    startsAt,
    endsAt,
    expectedEndsAt: readString(row.expected_ends_at) ?? readString(row.expectedEndsAt),
    videoDurationSec: readNumber(row.video_duration_sec) ?? readNumber(row.videoDurationSec),
    videoId: readString(row.video_id) ?? readString(row.videoId),
    title: readString(row.title) ?? "Dnes není plánované vysílání",
    channel: readString(row.channel) ?? readString(row.channel_name) ?? "ABJ TV",
  };
}

function pickActiveBlock(blocks: ExternalProgramBlock[], nowMs: number): ExternalProgramBlock | null {
  const active = blocks
    .filter((block) => {
      const startMs = parseDateMs(block.startsAt);
      const endMs = parseDateMs(block.endsAt);
      return startMs !== null && endMs !== null && startMs <= nowMs && nowMs < endMs;
    })
    .sort((a, b) => (parseDateMs(b.startsAt) ?? 0) - (parseDateMs(a.startsAt) ?? 0));

  if (active.length > 0) return active[0] ?? null;

  return [...blocks].sort((a, b) => (parseDateMs(a.startsAt) ?? 0) - (parseDateMs(b.startsAt) ?? 0))[0] ?? null;
}

function parseNowPayload(payload: unknown, nowMs: number): ExternalProgramBlock | null {
  if (Array.isArray(payload)) {
    const parsedArray = payload
      .map((row) => parseProgramBlock(row))
      .filter((row): row is ExternalProgramBlock => Boolean(row));
    if (parsedArray.length === 0) return null;
    return pickActiveBlock(parsedArray, nowMs);
  }

  const root = asRecord(payload);
  if (!root) return null;

  const directCandidates = [root.block, root.now_playing, root.nowPlaying, root.current];
  for (const candidate of directCandidates) {
    const parsed = parseProgramBlock(candidate);
    if (parsed) return parsed;
  }

  const maybeDirect = parseProgramBlock(root);
  if (maybeDirect) return maybeDirect;

  const arrayPayloads = [root.blocks, root.timeline, payload]
    .filter((value) => Array.isArray(value))
    .flatMap((value) => value as unknown[]);

  if (arrayPayloads.length === 0) return null;

  const parsed = arrayPayloads
    .map((row) => parseProgramBlock(row))
    .filter((row): row is ExternalProgramBlock => Boolean(row));
  if (parsed.length === 0) return null;
  return pickActiveBlock(parsed, nowMs);
}

function getEffectiveEndMs(block: ExternalProgramBlock | null): number | null {
  if (!block) return null;
  const expectedEndMs = parseDateMs(block.expectedEndsAt);
  if (expectedEndMs !== null) return expectedEndMs;

  const startMs = parseDateMs(block.startsAt);
  const slotEndMs = parseDateMs(block.endsAt);
  if (startMs !== null && slotEndMs !== null && block.videoDurationSec && block.videoDurationSec > 0) {
    return Math.min(slotEndMs, startMs + block.videoDurationSec * 1000);
  }

  return slotEndMs;
}

function formatRemainingLabel(remainingSeconds: number): string {
  if (!Number.isFinite(remainingSeconds) || remainingSeconds <= 5) return "za chvíli";
  if (remainingSeconds < 60) return `za ${remainingSeconds} s`;
  return `za ${Math.ceil(remainingSeconds / 60)} min`;
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
  const [activeBlock, setActiveBlock] = useState<ExternalProgramBlock | null>(null);
  const [clockNowMs, setClockNowMs] = useState(() => Date.now());

  const activeBlockRef = useRef<ExternalProgramBlock | null>(null);
  const endTimerRef = useRef<number | null>(null);
  const lastEndTriggerRef = useRef(0);
  const syncPromiseRef = useRef<Promise<void> | null>(null);

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

  useEffect(() => {
    activeBlockRef.current = activeBlock;
  }, [activeBlock]);

  const clearEndTimer = useCallback(() => {
    if (endTimerRef.current === null) return;
    window.clearTimeout(endTimerRef.current);
    endTimerRef.current = null;
  }, []);

  const applyProgramBlock = useCallback((block: ExternalProgramBlock) => {
    const startMs = parseDateMs(block.startsAt);
    const offsetSeconds =
      startMs === null ? 0 : Math.max(0, Math.floor((Date.now() - startMs) / 1000));

    setActiveBlock(block);
    setVideoId(block.videoId);
    setTitle(block.title);
    setChannelName(block.channel);
    setStartSeconds(offsetSeconds);
    setIsLive(true);
  }, []);

  const syncNowPlaying = useCallback(async () => {
    if (syncPromiseRef.current) {
      await syncPromiseRef.current;
      return;
    }

    const request = (async () => {
      const endpoints = ["/api/replit/program/now", "/api/replit/program"];
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, { cache: "no-store" });
          if (!response.ok) continue;
          const payload = (await response.json()) as unknown;
          const block = parseNowPayload(payload, Date.now());
          if (!block) continue;
          applyProgramBlock(block);
          return;
        } catch (error) {
          console.warn("live-page-playout-sync-failed", { endpoint, error });
        }
      }
    })();

    syncPromiseRef.current = request;
    try {
      await request;
    } finally {
      syncPromiseRef.current = null;
    }
  }, [applyProgramBlock]);

  const handleVideoEnd = useCallback(async () => {
    const nowMs = Date.now();
    if (nowMs - lastEndTriggerRef.current < END_TRIGGER_DEDUP_MS) return;
    lastEndTriggerRef.current = nowMs;

    clearEndTimer();

    const block = activeBlockRef.current;
    const slotEndMs = parseDateMs(block?.endsAt ?? null);
    const gapSeconds = slotEndMs === null ? 0 : Math.floor((slotEndMs - Date.now()) / 1000);
    if (gapSeconds > 5 && block?.blockId) {
      const query = new URLSearchParams({
        seconds: String(Math.max(1, gapSeconds)),
        current_block_id: block.blockId,
      });
      try {
        await fetch(`/api/replit/program/fill-gap?${query.toString()}`, {
          method: "GET",
          cache: "no-store",
        });
      } catch (error) {
        console.warn("live-page-fill-gap-request-failed", error);
      }
    }

    await syncNowPlaying();
  }, [clearEndTimer, syncNowPlaying]);

  useEffect(() => {
    void syncNowPlaying();
    const timer = window.setInterval(() => {
      void syncNowPlaying();
    }, NOW_REFRESH_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [syncNowPlaying]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClockNowMs(Date.now());
    }, 1_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    clearEndTimer();
    const endMs = getEffectiveEndMs(activeBlock);
    if (endMs === null) return;
    const delay = Math.max(0, endMs - Date.now());
    endTimerRef.current = window.setTimeout(() => {
      void handleVideoEnd();
    }, Math.min(delay, MAX_TIMEOUT_MS));
    return clearEndTimer;
  }, [
    activeBlock?.blockId,
    activeBlock?.endsAt,
    activeBlock?.expectedEndsAt,
    clearEndTimer,
    handleVideoEnd,
  ]);

  const { remainingLabel, progressPercent } = useMemo(() => {
    const startMs = parseDateMs(activeBlock?.startsAt ?? null);
    const endMs = getEffectiveEndMs(activeBlock);
    if (startMs === null || endMs === null || endMs <= startMs) {
      return { remainingLabel: "za chvíli", progressPercent: 0 };
    }

    const totalMs = endMs - startMs;
    const elapsedMs = Math.max(0, Math.min(totalMs, clockNowMs - startMs));
    const remainingSeconds = Math.max(0, Math.floor((endMs - clockNowMs) / 1000));
    return {
      remainingLabel: formatRemainingLabel(remainingSeconds),
      progressPercent: Math.round((elapsedMs / totalMs) * 100),
    };
  }, [activeBlock, clockNowMs]);

  const nowNextWindow = useMemo(() => {
    if (activeBlock) {
      const nowEndMs = getEffectiveEndMs(activeBlock) ?? Date.now() + 25 * 60_000;
      const nextStartIso = new Date(nowEndMs).toISOString();
      const nextEndIso = new Date(nowEndMs + 30 * 60_000).toISOString();
      return {
        nowStartIso: activeBlock.startsAt,
        nowEndIso: new Date(nowEndMs).toISOString(),
        nextStartIso,
        nextEndIso,
      };
    }
    const base = new Date();
    const plus25 = new Date(base.getTime() + 25 * 60_000);
    const plus55 = new Date(base.getTime() + 55 * 60_000);
    return {
      nowStartIso: base.toISOString(),
      nowEndIso: plus25.toISOString(),
      nextStartIso: plus25.toISOString(),
      nextEndIso: plus55.toISOString(),
    };
  }, [activeBlock]);

  return (
    <section className="min-h-screen bg-abj-main text-abj-text1">
      <div className="flex h-[calc(100vh-46px)] overflow-hidden">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="px-5 pt-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-abj-text2">ABJ vysílání 24/7</p>
          </div>
          <div className="px-5 pt-5">
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
                setIsLive(true);
              }}
              onVideoEnded={() => {
                void handleVideoEnd();
              }}
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
            nowItem={
              activeBlock || nowItem
                ? {
                    title: activeBlock?.title ?? nowItem?.title ?? "Bez aktuálního pořadu",
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
        <Hospoda />
      </div>
    </section>
  );
}

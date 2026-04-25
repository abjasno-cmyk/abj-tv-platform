"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  fetchPublishedContext,
  fetchPublishedVideos,
  type ContextClaim,
  type PublishedVideo,
} from "@/lib/contextLayerApi";
import { ContextTimeline, type ContextTimelineItem } from "@/components/context/ContextTimeline";
import { InsightPanel } from "@/components/context/InsightPanel";

function toSeconds(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return value;
}

function parseTimestamp(timestamp: string): number {
  const parts = timestamp.split(":").map((part) => Number(part));
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 1) return parts[0];
  return 0;
}

function formatClock(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const hh = Math.floor(safe / 3600);
  const mm = Math.floor((safe % 3600) / 60);
  const ss = safe % 60;
  if (hh > 0) return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

function mapStatus(status: ContextClaim["status"]): ContextTimelineItem["status"] {
  if (status === "supported") return "podporovano";
  if (status === "conflicting") return "rozporuplne";
  return "nejasne";
}

function toTimelineItems(claims: ContextClaim[]): ContextTimelineItem[] {
  return claims.map((claim) => ({
    id: claim.id,
    time: claim.timestamp,
    claim: claim.claimText,
    context: claim.contextText,
    sourceTitle: claim.sources[0]?.title,
    sourceUrl: claim.sources[0]?.url,
    status: mapStatus(claim.status),
  }));
}

function chooseInitialVideo(videos: PublishedVideo[], preferredId: string | null): PublishedVideo | null {
  if (videos.length === 0) return null;
  if (preferredId) {
    const found = videos.find((video) => video.id === preferredId);
    if (found) return found;
  }
  return videos[0];
}

type ContextTimelineBarProps = {
  claims: ContextClaim[];
  duration: number;
  activeClaimId: string | null;
  onSeek: (seconds: number) => void;
};

function ContextTimelineBar({ claims, duration, activeClaimId, onSeek }: ContextTimelineBarProps) {
  if (claims.length === 0) return null;
  const baseDuration = duration > 0 ? duration : Math.max(...claims.map((claim) => claim.timeSeconds), 1);

  return (
    <div className="relative mt-3 h-4">
      <div className="absolute inset-x-0 top-2 h-[2px] rounded-full bg-white/10" />
      {claims.map((claim) => {
        const left = Math.min(100, Math.max(0, (claim.timeSeconds / baseDuration) * 100));
        const isActive = claim.id === activeClaimId;
        return (
          <button
            key={claim.id}
            type="button"
            title={`${claim.timestamp} — ${claim.claimText}`}
            onClick={() => onSeek(claim.timeSeconds)}
            className={`group absolute top-0 h-4 w-4 -translate-x-1/2 rounded-full border border-white/50 bg-amber-400 transition hover:scale-110 ${
              isActive ? "ring-2 ring-white/70" : "opacity-90"
            }`}
            style={{ left: `${left}%` }}
          >
            <span className="pointer-events-none absolute bottom-[140%] left-1/2 hidden max-w-[220px] -translate-x-1/2 rounded bg-[#0F1D35] px-2 py-1 text-left text-[11px] text-abj-text1 group-hover:block">
              <span className="block font-semibold">{claim.timestamp}</span>
              <span className="line-clamp-2 text-abj-text2">{claim.claimText}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function VideosContextPage() {
  const [videos, setVideos] = useState<PublishedVideo[]>([]);
  const [videosLoading, setVideosLoading] = useState(true);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [claims, setClaims] = useState<ContextClaim[]>([]);
  const [videoReady, setVideoReady] = useState(false);
  const [contextLoading, setContextLoading] = useState(false);
  const [contextUnavailable, setContextUnavailable] = useState(false);
  const [contextError, setContextError] = useState(false);
  const [activeClaimId, setActiveClaimId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const selectedVideo = useMemo(() => videos.find((video) => video.id === selectedVideoId) ?? null, [videos, selectedVideoId]);
  const timelineItems = useMemo(() => toTimelineItems(claims), [claims]);
  const insight = useMemo(() => {
    if (claims.length === 0) {
      return { headline: null, bullets: [] as string[] };
    }
    const bullets = claims
      .slice(0, 3)
      .map((claim) => claim.contextText.trim())
      .filter((line) => line.length > 0)
      .slice(0, 3);
    return {
      headline: `${claims.length} kontextových bodů k aktuálnímu videu`,
      bullets,
    };
  }, [claims]);
  const videoAvailable = Boolean(selectedVideoId);

  useEffect(() => {
    let cancelled = false;
    void fetchPublishedVideos()
      .then((rows) => {
        if (cancelled) return;
        setVideos(rows);
        const preferred = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("videoId") : null;
        const initial = chooseInitialVideo(rows, preferred);
        setSelectedVideoId(initial?.id ?? null);
      })
      .catch((error: unknown) => {
        console.error("videos-fetch-failed", error);
        if (!cancelled) setVideos([]);
      })
      .finally(() => {
        if (!cancelled) setVideosLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadContextForVideo = (videoId: string) => {
    setContextLoading(true);
    setContextUnavailable(false);
    setContextError(false);
    void fetchPublishedContext(videoId)
      .then((rows) => {
        setClaims(rows);
        setContextUnavailable(rows.length === 0);
        setActiveClaimId(rows[0]?.id ?? null);
      })
      .catch((error: unknown) => {
        console.error("context-fetch-failed", error);
        setClaims([]);
        setContextError(true);
      })
      .finally(() => {
        setContextLoading(false);
      });
  };

  useEffect(() => {
    const player = videoRef.current;
    if (!player) return;

    const onTime = () => {
      const time = toSeconds(player.currentTime);
      setCurrentTime(time);
      const active = claims.reduce<ContextClaim | null>((acc, claim) => (claim.timeSeconds <= time ? claim : acc), null);
      setActiveClaimId(active?.id ?? null);
    };
    const onMeta = () => setDuration(toSeconds(player.duration));
    player.addEventListener("timeupdate", onTime);
    player.addEventListener("loadedmetadata", onMeta);
    return () => {
      player.removeEventListener("timeupdate", onTime);
      player.removeEventListener("loadedmetadata", onMeta);
    };
  }, [claims, selectedVideoId]);

  const seekTo = (seconds: number) => {
    const safe = Math.max(0, Math.floor(seconds));
    if (videoRef.current) {
      videoRef.current.currentTime = safe;
      setCurrentTime(safe);
      return;
    }
    if (iframeRef.current && selectedVideo?.youtubeId) {
      iframeRef.current.src = `https://www.youtube.com/embed/${selectedVideo.youtubeId}?start=${safe}`;
      setCurrentTime(safe);
    }
  };

  if (videosLoading) {
    return (
      <section className="space-y-4 px-5 py-5">
        <div className="h-24 animate-pulse rounded bg-gray-800/80" />
        <div className="h-24 animate-pulse rounded bg-gray-800/70" />
      </section>
    );
  }

  if (!selectedVideo) {
    return (
      <section className="px-5 py-5">
        <div className="rounded-xl border border-[var(--abj-gold-dim)] bg-[var(--card)] p-5 text-sm text-abj-text2">
          Video není dostupné.
        </div>
      </section>
    );
  }

  const isHtmlVideo = /\.(mp4|webm|ogg)(\?|$)/i.test(selectedVideo.videoUrl);

  return (
    <section className="space-y-4 px-5 py-5">
      <header>
        <p className="text-[11px] uppercase tracking-[0.12em] text-abj-text2">Context Engine v2</p>
        <h1 className="mt-1 text-2xl font-semibold text-abj-text1">Video + kontext</h1>
      </header>

      <div className="rounded-xl border border-[var(--abj-gold-dim)] bg-[var(--card)] p-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-abj-text1">{selectedVideo.title}</h2>
          <select
            value={selectedVideo.id}
            onChange={(event) => {
              setVideoReady(false);
              setSelectedVideoId(event.target.value);
            }}
            className="rounded-md border border-white/15 bg-[#081a30] px-3 py-1.5 text-sm text-abj-text1"
          >
            {videos.map((video) => (
              <option key={video.id} value={video.id}>
                {video.title}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-hidden rounded-lg bg-black">
          {isHtmlVideo ? (
            <video
              ref={videoRef}
              className="aspect-video w-full"
              controls
              preload="metadata"
              onLoadedMetadata={() => setVideoReady(true)}
            >
              <source src={selectedVideo.videoUrl} />
            </video>
          ) : (
            <iframe
              ref={iframeRef}
              title={selectedVideo.title}
              src={
                selectedVideo.youtubeId
                  ? `https://www.youtube.com/embed/${selectedVideo.youtubeId}`
                  : selectedVideo.videoUrl
              }
              className="aspect-video w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              onLoad={() => setVideoReady(true)}
            />
          )}
        </div>

        <div className="mt-2 flex items-center justify-between text-xs text-abj-text2">
          <span>{formatClock(currentTime)}</span>
          <span>{duration > 0 ? formatClock(duration) : "--:--"}</span>
        </div>
        <ContextTimelineBar claims={claims} duration={duration} activeClaimId={activeClaimId} onSeek={seekTo} />
      </div>

      {!contextError ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            {contextLoading ? (
              <div className="h-28 animate-pulse rounded bg-gray-800/70" />
            ) : contextUnavailable ? (
              <div className="rounded-xl border border-[var(--abj-gold-dim)] bg-[var(--card)] p-4 text-sm text-abj-text2">
                Kontext zatím není k dispozici
              </div>
            ) : (
              <ContextTimeline
                items={timelineItems}
                activeId={activeClaimId}
                onSeek={(item) => {
                  setActiveClaimId(item.id);
                  seekTo(parseTimestamp(item.time));
                }}
              />
            )}
          </div>
          <div className="xl:sticky xl:top-20 xl:self-start">
            <InsightPanel loading={contextLoading} headline={insight.headline} bullets={insight.bullets} />
          </div>
        </div>
      ) : null}
    </section>
  );
}
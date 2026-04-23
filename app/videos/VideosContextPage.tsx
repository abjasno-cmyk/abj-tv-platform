"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import YouTube, { type YouTubeProps } from "react-youtube";

import {
  fetchPublishedContext,
  fetchPublishedVideos,
  type ContextClaim,
  type ContextStatus,
  type PublishedVideo,
} from "@/lib/contextLayerApi";

type ClaimStatusStyle = {
  ring: string;
  badge: string;
  dot: string;
  label: string;
};

const STATUS_STYLES: Record<ContextStatus, ClaimStatusStyle> = {
  supported: {
    ring: "border-emerald-500/30",
    badge: "bg-emerald-500/15 text-emerald-200",
    dot: "bg-emerald-300",
    label: "Podloženo",
  },
  conflicting: {
    ring: "border-amber-500/35",
    badge: "bg-amber-500/15 text-amber-200",
    dot: "bg-amber-300",
    label: "Rozpor",
  },
  not_found: {
    ring: "border-slate-500/30",
    badge: "bg-slate-500/15 text-slate-200",
    dot: "bg-slate-300",
    label: "Nedohledáno",
  },
};

function formatSourceType(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (normalized === "law") return "Právo";
  if (normalized === "media") return "Média";
  if (normalized === "statistics") return "Statistiky";
  return value.trim() || "Zdroj";
}

function toSeconds(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return value;
}

function formatClock(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const hh = Math.floor(safe / 3600);
  const mm = Math.floor((safe % 3600) / 60);
  const ss = safe % 60;
  if (hh > 0) {
    return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  }
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

function chooseInitialVideo(videos: PublishedVideo[], preferredId: string | null): PublishedVideo | null {
  if (videos.length === 0) return null;
  if (preferredId) {
    const matched = videos.find((video) => video.id === preferredId);
    if (matched) return matched;
  }
  return videos[0];
}

type MarkerBarProps = {
  duration: number;
  claims: ContextClaim[];
  activeClaimId: string | null;
  onSeek: (seconds: number) => void;
};

function MarkerBar({ duration, claims, activeClaimId, onSeek }: MarkerBarProps) {
  if (duration <= 0 || claims.length === 0) return null;

  return (
    <div className="relative mt-2 h-3">
      <div className="absolute inset-x-0 top-1.5 h-[2px] rounded-full bg-white/10" />
      {claims.map((claim) => {
        const left = Math.min(100, Math.max(0, (claim.timeSeconds / duration) * 100));
        const statusStyle = STATUS_STYLES[claim.status];
        const isActive = activeClaimId === claim.id;
        return (
          <button
            key={claim.id}
            type="button"
            className={`group absolute top-0 h-3 w-3 -translate-x-1/2 rounded-full border border-white/35 ${statusStyle.dot} ${
              isActive ? "scale-110 ring-2 ring-white/60" : "opacity-90 hover:scale-110"
            }`}
            style={{ left: `${left}%` }}
            title={`${claim.timestamp} — ${claim.claimText}`}
            onClick={() => onSeek(claim.timeSeconds)}
            aria-label={`Přejít na ${claim.timestamp}`}
          >
            <span className="pointer-events-none absolute bottom-[145%] left-1/2 z-20 hidden max-w-[220px] -translate-x-1/2 rounded-md border border-white/10 bg-[#081a30] px-2 py-1 text-left text-[11px] text-abj-text1 shadow-lg group-hover:block">
              <span className="block font-semibold">{claim.timestamp}</span>
              <span className="line-clamp-2 text-abj-text2">{claim.claimText}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

type ContextPanelProps = {
  claims: ContextClaim[];
  activeClaimId: string | null;
  loading: boolean;
  unavailable: boolean;
  onTimestampClick: (seconds: number) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
};

function ContextPanel({
  claims,
  activeClaimId,
  loading,
  unavailable,
  onTimestampClick,
  collapsed,
  onToggleCollapse,
}: ContextPanelProps) {
  const itemRefs = useRef(new Map<string, HTMLElement>());

  useEffect(() => {
    if (!activeClaimId) return;
    const element = itemRefs.current.get(activeClaimId);
    if (!element) return;
    element.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeClaimId]);

  if (collapsed) {
    return (
      <aside className="rounded-xl border border-[var(--abj-gold-dim)] bg-abj-panel p-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-abj-text1">Kontext</p>
          <button
            type="button"
            className="rounded-md border border-white/15 px-2 py-1 text-xs text-abj-text2 hover:text-abj-text1"
            onClick={onToggleCollapse}
          >
            Rozbalit
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside className="rounded-xl border border-[var(--abj-gold-dim)] bg-abj-panel">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.1em] text-abj-text2">Context Engine v2</p>
          <h2 className="text-sm font-semibold text-abj-text1">Kontextová tvrzení</h2>
        </div>
        <button
          type="button"
          className="rounded-md border border-white/15 px-2 py-1 text-xs text-abj-text2 hover:text-abj-text1"
          onClick={onToggleCollapse}
        >
          Sbalit
        </button>
      </div>

      <div className="max-h-[70vh] space-y-3 overflow-y-auto p-4">
        {loading ? <p className="text-sm text-abj-text2">Načítáme kontext…</p> : null}
        {!loading && unavailable ? <p className="text-sm text-abj-text2">Kontext zatím není k dispozici</p> : null}
        {!loading && !unavailable && claims.length === 0 ? (
          <p className="text-sm text-abj-text2">Kontext zatím není k dispozici</p>
        ) : null}

        {claims.map((claim) => {
          const style = STATUS_STYLES[claim.status];
          const isActive = activeClaimId === claim.id;
          return (
            <article
              key={claim.id}
              ref={(element) => {
                if (element) itemRefs.current.set(claim.id, element);
                else itemRefs.current.delete(claim.id);
              }}
              className={`rounded-lg border bg-[#091a31] p-3 transition-colors ${
                isActive ? `${style.ring} bg-[#10243f]` : "border-white/10"
              }`}
            >
              <div className="mb-2 flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-md border border-white/15 px-2 py-0.5 text-xs font-medium text-abj-text1 hover:bg-white/5"
                  onClick={() => onTimestampClick(claim.timeSeconds)}
                >
                  {claim.timestamp}
                </button>
                <span className={`rounded-full px-2 py-0.5 text-[11px] ${style.badge}`}>{style.label}</span>
              </div>

              <p className="text-sm font-medium text-abj-text1">{claim.claimText}</p>
              <p className="mt-2 text-sm leading-relaxed text-abj-text2">{claim.contextText}</p>

              {claim.sourceQualitySummary ? (
                <p className="mt-2 text-xs text-abj-text2">Kvalita zdrojů: {claim.sourceQualitySummary}</p>
              ) : null}

              {claim.sources.length > 0 ? (
                <ul className="mt-3 space-y-2">
                  {claim.sources.map((source) => (
                    <li key={`${claim.id}-${source.url}`} className="text-xs">
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-abj-text2 hover:text-abj-text1"
                      >
                        <span className="line-clamp-1">{source.title}</span>
                        <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.08em] text-abj-text2">
                          {formatSourceType(source.sourceType)}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>
          );
        })}
      </div>
    </aside>
  );
}

type VideoSelectProps = {
  videos: PublishedVideo[];
  currentId: string | null;
  onChange: (videoId: string) => void;
};

function VideoSelect({ videos, currentId, onChange }: VideoSelectProps) {
  return (
    <label className="inline-flex items-center gap-2 text-sm text-abj-text2">
      <span>Video:</span>
      <select
        value={currentId ?? ""}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-md border border-white/15 bg-[#081a30] px-3 py-1.5 text-sm text-abj-text1 outline-none focus:border-white/30"
      >
        {videos.map((video) => (
          <option key={video.id} value={video.id}>
            {video.title}
          </option>
        ))}
      </select>
    </label>
  );
}

export function VideosContextPage() {
  const [videos, setVideos] = useState<PublishedVideo[]>([]);
  const [videosLoading, setVideosLoading] = useState(true);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);

  const [claims, setClaims] = useState<ContextClaim[]>([]);
  const [contextLoading, setContextLoading] = useState(false);
  const [contextUnavailable, setContextUnavailable] = useState(false);
  const [contextError, setContextError] = useState(false);
  const [panelCollapsed, setPanelCollapsed] = useState(false);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playerReady, setPlayerReady] = useState(false);

  const htmlVideoRef = useRef<HTMLVideoElement>(null);
  const youtubePlayerRef = useRef<{
    getCurrentTime: () => number;
    getDuration: () => number;
    seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  } | null>(null);
  const contextRequestTokenRef = useRef(0);
  const youtubeOpts = useMemo<YouTubeProps["opts"]>(
    () => ({
      width: "100%",
      height: "100%",
      playerVars: {
        rel: 0,
        modestbranding: 1,
      },
    }),
    []
  );

  const selectedVideo = useMemo(
    () => videos.find((video) => video.id === selectedVideoId) ?? null,
    [videos, selectedVideoId]
  );
  const playerMode = selectedVideo?.youtubeId ? "youtube" : "html5";

  const activeClaim = useMemo(() => {
    if (claims.length === 0) return null;
    let current: ContextClaim | null = null;
    for (const claim of claims) {
      if (claim.timeSeconds <= currentTime) {
        current = claim;
      } else {
        break;
      }
    }
    return current;
  }, [claims, currentTime]);
  const effectiveDuration = useMemo(() => {
    const claimTail = claims.length > 0 ? claims[claims.length - 1].timeSeconds : 0;
    return Math.max(duration, claimTail + 15);
  }, [claims, duration]);

  const resetVideoScopedState = (nextDuration: number | null) => {
    contextRequestTokenRef.current += 1;
    youtubePlayerRef.current = null;
    setCurrentTime(0);
    setDuration(nextDuration ?? 0);
    setPlayerReady(false);
    setClaims([]);
    setContextLoading(false);
    setContextUnavailable(false);
    setContextError(false);
  };

  const loadContextForVideo = (videoId: string) => {
    const requestToken = ++contextRequestTokenRef.current;
    setContextLoading(true);
    setContextUnavailable(false);
    setContextError(false);

    void fetchPublishedContext(videoId)
      .then((rows) => {
        if (requestToken !== contextRequestTokenRef.current) return;
        setClaims(rows);
        setContextUnavailable(rows.length === 0);
      })
      .catch((error: unknown) => {
        if (requestToken !== contextRequestTokenRef.current) return;
        console.error("context-fetch-failed", error);
        setClaims([]);
        setContextError(true);
      })
      .finally(() => {
        if (requestToken !== contextRequestTokenRef.current) return;
        setContextLoading(false);
      });
  };

  const handleVideoSelection = (videoId: string) => {
    const nextVideo = videos.find((video) => video.id === videoId) ?? null;
    resetVideoScopedState(nextVideo?.durationSeconds ?? null);
    setSelectedVideoId(videoId);
  };

  useEffect(() => {
    let cancelled = false;
    void fetchPublishedVideos()
      .then((rows) => {
        if (cancelled) return;
        setVideos(rows);
        const preferredId = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("videoId") : null;
        const initial = chooseInitialVideo(rows, preferredId);
        resetVideoScopedState(initial?.durationSeconds ?? null);
        setSelectedVideoId(initial?.id ?? null);
      })
      .catch((error: unknown) => {
        console.error("videos-fetch-failed", error);
        if (cancelled) return;
        setVideos([]);
      })
      .finally(() => {
        if (!cancelled) setVideosLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (playerMode !== "html5") return;
    const player = htmlVideoRef.current;
    if (!player) return;

    const onTime = () => setCurrentTime(toSeconds(player.currentTime));
    const onMeta = () => setDuration(toSeconds(player.duration));
    const onSeek = () => setCurrentTime(toSeconds(player.currentTime));

    player.addEventListener("timeupdate", onTime);
    player.addEventListener("loadedmetadata", onMeta);
    player.addEventListener("seeked", onSeek);

    return () => {
      player.removeEventListener("timeupdate", onTime);
      player.removeEventListener("loadedmetadata", onMeta);
      player.removeEventListener("seeked", onSeek);
    };
  }, [playerMode, selectedVideoId]);

  useEffect(() => {
    if (playerMode !== "youtube") return;
    if (!playerReady) return;

    const timer = window.setInterval(() => {
      const player = youtubePlayerRef.current;
      if (!player) return;
      setCurrentTime(toSeconds(player.getCurrentTime()));
      setDuration((prev) => {
        const next = toSeconds(player.getDuration());
        return next > 0 ? next : prev;
      });
    }, 500);

    return () => {
      window.clearInterval(timer);
    };
  }, [playerMode, playerReady, selectedVideoId]);

  const seekTo = (seconds: number) => {
    const safeSeconds = Math.max(0, Math.floor(seconds));
    if (playerMode === "html5" && htmlVideoRef.current) {
      htmlVideoRef.current.currentTime = safeSeconds;
      setCurrentTime(safeSeconds);
      return;
    }
    if (playerMode === "youtube" && youtubePlayerRef.current) {
      youtubePlayerRef.current.seekTo(safeSeconds, true);
      setCurrentTime(safeSeconds);
    }
  };

  if (videosLoading) {
    return (
      <section className="px-5 py-6">
        <div className="rounded-xl border border-[var(--abj-gold-dim)] bg-abj-panel p-5 text-sm text-abj-text2">
          Načítáme videa…
        </div>
      </section>
    );
  }

  if (!selectedVideo) {
    return (
      <section className="px-5 py-6">
        <div className="rounded-xl border border-[var(--abj-gold-dim)] bg-abj-panel p-5 text-sm text-abj-text2">
          Publikovaná videa nejsou dostupná.
        </div>
      </section>
    );
  }

  const activeClaimId = activeClaim?.id ?? null;
  const showContextPanel = !contextError;

  return (
    <section className="space-y-4 px-5 py-5">
      <header className="space-y-2">
        <p className="text-[11px] uppercase tracking-[0.12em] text-abj-text2">ABJ Frontend</p>
        <h1 className="font-[var(--font-serif)] text-2xl font-semibold text-abj-text1">Context Layer v2</h1>
        <p className="text-sm text-abj-text2">Neutrální kontext k tvrzením synchronně podle času videa.</p>
      </header>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-3">
          <div className="rounded-xl border border-[var(--abj-gold-dim)] bg-abj-panel p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-medium text-abj-text1">{selectedVideo.title}</h2>
              <VideoSelect videos={videos} currentId={selectedVideo.id} onChange={handleVideoSelection} />
            </div>

            <div className="relative overflow-hidden rounded-lg bg-black">
              {playerMode === "youtube" ? (
                <div className="aspect-video w-full">
                  <YouTube
                    videoId={selectedVideo.youtubeId ?? undefined}
                    opts={youtubeOpts}
                    iframeClassName="h-full w-full"
                    title={selectedVideo.title}
                    onReady={(event) => {
                      youtubePlayerRef.current = event.target;
                      setDuration(toSeconds(event.target.getDuration()) || selectedVideo.durationSeconds || 0);
                      setPlayerReady(true);
                      loadContextForVideo(selectedVideo.id);
                    }}
                  />
                </div>
              ) : (
                <video
                  ref={htmlVideoRef}
                  className="aspect-video w-full"
                  controls
                  preload="metadata"
                  onLoadedMetadata={(event) => {
                    const target = event.currentTarget;
                    setDuration(toSeconds(target.duration) || selectedVideo.durationSeconds || 0);
                    setPlayerReady(true);
                    loadContextForVideo(selectedVideo.id);
                  }}
                >
                  <source src={selectedVideo.videoUrl} />
                </video>
              )}
            </div>

            <div className="mt-2 flex items-center justify-between text-xs text-abj-text2">
              <span>{formatClock(currentTime)}</span>
              <span>{duration > 0 ? formatClock(duration) : "--:--"}</span>
            </div>
            <MarkerBar duration={effectiveDuration} claims={claims} activeClaimId={activeClaimId} onSeek={seekTo} />
          </div>

          {showContextPanel ? (
            <div className="xl:hidden">
              <ContextPanel
                claims={claims}
                activeClaimId={activeClaimId}
                loading={contextLoading}
                unavailable={contextUnavailable}
                onTimestampClick={seekTo}
                collapsed={panelCollapsed}
                onToggleCollapse={() => setPanelCollapsed((prev) => !prev)}
              />
            </div>
          ) : null}
        </div>

        {showContextPanel ? (
          <div className="hidden xl:block">
            <ContextPanel
              claims={claims}
              activeClaimId={activeClaimId}
              loading={contextLoading}
              unavailable={contextUnavailable}
              onTimestampClick={seekTo}
              collapsed={panelCollapsed}
              onToggleCollapse={() => setPanelCollapsed((prev) => !prev)}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}

"use client";

// ProudX živé vysílání — samostatná vertikála, vlastní vizuální identita.
// Dark cinematic editorial: přehrávač jako centrální stage. Znovupoužívá
// playout engine (PlayoutStage + usePlayoutLoop) z jádra; layout je vlastní.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { PlayoutStage } from "@/components/abj/playout/PlayoutStage";
import { usePlayoutLoop } from "@/components/abj/playout/usePlayoutLoop";
import { HeroPlayerBar, type PlaybackSpeed } from "@/components/abj/playout/HeroPlayerBar";
import { clampSeekSeconds } from "@/lib/playerTime";
import type { PlayerHandle, PlayoutSurface } from "@/lib/playout/types";
import type { DayProgram, ProgramItem } from "@/lib/epg-types";
import type { LiveChannelGroup, LiveChannelVideo } from "@/components/abj/ChannelDirectory";
import { ProudXHeader } from "@/components/proudx/ProudXHeader";
import { ProudXFooter } from "@/components/proudx/ProudXFooter";
import { tenantChannelLabel } from "@/lib/tenant";
import {
  mergeChannelVideosByVideoId,
  selectLatestNonShortChannelVideos,
} from "@/lib/liveChannelVideos";

import "@/app/live/proudx-live.css";

type ProudXLiveProps = {
  days: DayProgram[];
  channels: LiveChannelGroup[];
  videoId: string | null;
  title: string;
  channelName: string;
  isLive: boolean;
  startSeconds?: number;
  onSelect: (item: ProgramItem) => void;
  onReturnToLive: () => void;
  onSelectChannelVideo: (payload: { channelName: string; video: LiveChannelVideo }) => void;
};

// Panel kanálu ukazuje 6 nejnovějších ne-short videí; pod tento počet se
// cache z feedu doplní živým dotazem na /api/channel-latest (jako VEROX).
const CHANNEL_PANEL_LIMIT = 6;
// Z API tahej víc kandidátů — Shorts se filtrují až u nás.
const CHANNEL_PANEL_FETCH_LIMIT = 24;

const CZ_DATE = new Intl.DateTimeFormat("cs-CZ", { day: "numeric", month: "numeric", year: "numeric" });

function premiereDateLabel(publishedAt: string | undefined): string | null {
  if (!publishedAt) return null;
  const date = new Date(publishedAt);
  // Epocha 0 je fallback pro chybějící datum — nezobrazovat.
  if (!Number.isFinite(date.getTime()) || date.getFullYear() < 2000) return null;
  return CZ_DATE.format(date);
}

function thumbFor(item: { thumbnail: string | null; videoId: string | null }): string {
  if (item.thumbnail && item.thumbnail.trim()) return item.thumbnail.trim();
  if (item.videoId) return `https://img.youtube.com/vi/${item.videoId}/hqdefault.jpg`;
  return "";
}

function initials(name: string): string {
  const parts = name.replace(/[^\p{L}\p{N} ]/gu, " ").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "•";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}


function ChannelAvatar({ name, url }: { name: string; url: string | null }) {
  const [failed, setFailed] = useState(false);
  if (url && !failed) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="pxc-avatar" src={url} alt={name} loading="lazy" onError={() => setFailed(true)} />;
  }
  return <span className="pxc-avatar pxc-avatar--fallback" aria-hidden="true">{initials(name)}</span>;
}

export default function ProudXLive({
  days,
  channels,
  videoId,
  title,
  channelName,
  isLive,
  startSeconds = 0,
  onSelect,
  onReturnToLive,
  onSelectChannelVideo,
}: ProudXLiveProps) {
  const heroRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<PlayerHandle | null>(null);
  const [muted, setMuted] = useState(true);
  const [volume, setVolume] = useState(100);
  const [playing, setPlaying] = useState(true);
  const [playerCurrentTime, setPlayerCurrentTime] = useState(0);
  const [playerDuration, setPlayerDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<PlaybackSpeed>(1);
  const [barExpanded, setBarExpanded] = useState(false);

  // Rozbalený kanál — jako VEROX ChannelDirectory: klik = panel s videi
  // kanálu, klik na video = přehrát v hlavním okně. Když payload videa nemá,
  // dotáhnou se přes /api/channel-latest (sdílená routa s VEROXem).
  const [activeChannelName, setActiveChannelName] = useState<string | null>(null);
  const [fetchedByChannel, setFetchedByChannel] = useState<Record<string, LiveChannelVideo[]>>({});
  const [channelLoading, setChannelLoading] = useState<string | null>(null);
  const [channelError, setChannelError] = useState<Record<string, string>>({});

  const loadChannelVideos = useCallback(
    async (channel: LiveChannelGroup) => {
      const key = channel.channelName;
      if (channel.videos.length >= CHANNEL_PANEL_LIMIT) return;
      if (Object.prototype.hasOwnProperty.call(fetchedByChannel, key)) return;
      if (!channel.channelId && !channel.channelUrl && !key.trim()) return;

      setChannelLoading(key);
      setChannelError((prev) => ({ ...prev, [key]: "" }));
      try {
        const params = new URLSearchParams();
        if (channel.channelUrl) params.set("channelUrl", channel.channelUrl);
        else if (channel.channelId) params.set("channelId", channel.channelId);
        params.set("channelName", key);
        params.set("limit", String(CHANNEL_PANEL_FETCH_LIMIT));
        const response = await fetch(`/api/channel-latest?${params.toString()}`, { cache: "no-store" });
        const payload = (await response.json().catch(() => ({}))) as {
          videos?: Array<{ videoId?: string; title?: string; thumbnail?: string; publishedAt?: string }>;
          error?: string;
        };
        if (!response.ok) throw new Error(payload.error ?? `HTTP ${response.status}`);
        const videos = (payload.videos ?? [])
          .map((v): LiveChannelVideo | null => {
            const vid = v.videoId?.trim();
            const vtitle = v.title?.trim();
            if (!vid || !vtitle) return null;
            return {
              videoId: vid,
              title: vtitle,
              thumbnail: v.thumbnail?.trim() || null,
              publishedAt: v.publishedAt?.trim() || new Date(0).toISOString(),
            };
          })
          .filter((v): v is LiveChannelVideo => Boolean(v));
        setFetchedByChannel((prev) => ({ ...prev, [key]: videos }));
        if (videos.length === 0) {
          setChannelError((prev) => ({ ...prev, [key]: "Kanál momentálně neposkytuje dostupná videa." }));
        }
      } catch (error) {
        setFetchedByChannel((prev) => ({ ...prev, [key]: [] }));
        setChannelError((prev) => ({
          ...prev,
          [key]: error instanceof Error ? error.message : "Nepodařilo se načíst videa.",
        }));
      } finally {
        setChannelLoading((prev) => (prev === key ? null : prev));
      }
    },
    [fetchedByChannel],
  );

  // Po výběru videa z railů dole sroluj na hero — jinak divák nevidí, že hraje.
  const scrollToHero = useCallback(() => {
    heroRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const channelDetailRef = useRef<HTMLDivElement | null>(null);
  // Panel je NAD gridem — po kliku ze spodku gridu ho doscrolluj do zorneho pole.
  useEffect(() => {
    if (!activeChannelName) return;
    channelDetailRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [activeChannelName]);

  const activeChannel = useMemo(
    () => channels.find((ch) => ch.channelName === activeChannelName) ?? null,
    [channels, activeChannelName],
  );
  // Cache z feedu + živý dotaz dohromady (dedup dle videoId), Shorts ven.
  const activeChannelVideos = activeChannel
    ? selectLatestNonShortChannelVideos(
        mergeChannelVideosByVideoId(
          activeChannel.videos,
          fetchedByChannel[activeChannel.channelName] ?? [],
        ),
        CHANNEL_PANEL_LIMIT,
      )
    : [];

  const offset = Math.max(0, Math.floor(startSeconds));
  const { surface: playoutSurface, signalEnded } = usePlayoutLoop({
    enabled: isLive,
    initialBlock: isLive && videoId ? { videoId, title, offsetSeconds: offset } : null,
  });
  const heroSurface: PlayoutSurface | null = isLive
    ? playoutSurface
    : videoId
      ? { kind: "youtube", videoId, startSeconds: offset, title }
      : null;

  const registerPlayer = useCallback((player: PlayerHandle | null) => {
    playerRef.current = player;
  }, []);
  const handleEnded = useCallback(() => {
    if (isLive) signalEnded();
    else onReturnToLive();
  }, [isLive, signalEnded, onReturnToLive]);

  const currentVideoId = heroSurface?.kind === "youtube" ? heroSurface.videoId : null;
  const controlsEnabled = heroSurface?.kind === "youtube" && Boolean(currentVideoId);
  const displayTitle = (heroSurface?.kind === "youtube" ? heroSurface.title : undefined) ?? title;
  const displayChannel = (heroSurface?.kind === "youtube" ? heroSurface.channel : undefined) ?? channelName;

  useEffect(() => {
    if (!controlsEnabled) {
      setPlayerCurrentTime(0);
      setPlayerDuration(0);
      return;
    }
    const id = window.setInterval(() => {
      const p = playerRef.current;
      if (!p) return;
      setPlayerDuration(Math.max(0, Math.floor(p.getDuration?.() ?? 0)));
      setPlayerCurrentTime(Math.max(0, Math.floor(p.getCurrentTime?.() ?? 0)));
    }, 500);
    return () => window.clearInterval(id);
  }, [controlsEnabled, currentVideoId]);

  const applyAudio = useCallback((nextMuted: boolean, nextVolume: number) => {
    const p = playerRef.current;
    if (!p) return;
    const level = Math.min(100, Math.max(0, Math.round(nextVolume)));
    if (nextMuted || level === 0) {
      p.mute?.();
      return;
    }
    p.unMute?.();
    try {
      p.setVolume?.(level);
    } catch {
      /* embed bez hlasitosti */
    }
  }, []);

  const togglePlay = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    if (playing) p.pauseVideo?.();
    else p.playVideo?.();
    setPlaying(!playing);
  }, [playing]);

  const toggleMute = useCallback(() => {
    if (muted) {
      const restore = volume > 0 ? volume : 100;
      if (volume <= 0) setVolume(100);
      setMuted(false);
      applyAudio(false, restore);
      return;
    }
    setMuted(true);
    applyAudio(true, volume);
  }, [muted, volume, applyAudio]);

  const toggleFullscreen = useCallback(() => {
    const el = heroRef.current as (HTMLDivElement & { webkitRequestFullscreen?: () => void }) | null;
    if (!el) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen?.();
      return;
    }
    if (el.requestFullscreen) void el.requestFullscreen();
    else el.webkitRequestFullscreen?.();
  }, []);

  const seekTo = useCallback(
    (seconds: number) => {
      const p = playerRef.current;
      if (!p?.seekTo) return;
      const target = clampSeekSeconds(seconds, playerDuration);
      p.seekTo(target, true);
      setPlayerCurrentTime(target);
    },
    [playerDuration],
  );

  const changeVolume = useCallback(
    (next: number) => {
      const level = Math.min(100, Math.max(0, Math.round(next)));
      setVolume(level);
      if (level === 0) {
        setMuted(true);
        applyAudio(true, 0);
      } else {
        setMuted(false);
        applyAudio(false, level);
      }
    },
    [applyAudio],
  );

  const changeSpeed = useCallback((next: PlaybackSpeed) => {
    setPlaybackRate(next);
    try {
      playerRef.current?.setPlaybackRate?.(next);
    } catch {
      /* live streamy rychlost neberou */
    }
  }, []);

  // Celý program dne jako na VEROXu — strop 100 jen omezí degradovaný
  // 7denní buildEPG fallback. Nižší strop by pozdě večer uřízl právě hraný blok.
  const programItems = useMemo(
    () => days.flatMap((d) => d.items).filter((i) => Boolean(i.videoId)).slice(0, 100),
    [days],
  );

  // Vycentruj „Právě hraje" na aktuálně hraný blok (při startu i přepnutí) —
  // stejné chování jako VEROX rail, jinak rail začíná půlnočním openerem.
  const programRailRef = useRef<HTMLDivElement | null>(null);
  const currentCardRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    const id = window.setTimeout(() => {
      const el = currentCardRef.current;
      const container = programRailRef.current;
      if (!el || !container) return;
      const elRect = el.getBoundingClientRect();
      const contRect = container.getBoundingClientRect();
      const delta = elRect.left - contRect.left - (contRect.width - elRect.width) / 2;
      container.scrollBy({ left: delta, behavior: "smooth" });
    }, 120);
    return () => window.clearTimeout(id);
  }, [videoId, programItems.length]);

  return (
    <div className="px" data-live={isLive ? "1" : "0"}>
      <div className="px-bgglow" aria-hidden="true" />

      <ProudXHeader active="live" />

      <main className="px-main">
        {/* STAGE */}
        <section className="px-stage" aria-label="Živé vysílání">
          <div className="px-player" ref={heroRef}>
            <PlayoutStage
              surface={heroSurface}
              muted={muted}
              volume={volume}
              onEnded={handleEnded}
              onPlayerReady={registerPlayer}
              onPlayingChange={setPlaying}
            />
            <span className="px-guard" aria-hidden="true" />

            {isLive ? (
              <span className="px-onair"><span className="px-onair-dot" />Živě</span>
            ) : (
              <button type="button" className="px-backlive" onClick={onReturnToLive}>
                ← Zpět na živé vysílání
              </button>
            )}

            {/* Stejné ovládání jako VEROX: 3 kruhová tlačítka + HeroPlayerBar */}
            <div className="hero-ctrls">
              <button type="button" className="ctrl-play" onClick={togglePlay} aria-label={playing ? "Pozastavit" : "Přehrát"}>
                {playing ? (
                  <svg viewBox="0 0 24 24"><rect x="7" y="5" width="3.6" height="14" rx="1" /><rect x="13.4" y="5" width="3.6" height="14" rx="1" /></svg>
                ) : (
                  <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                )}
              </button>
              <button type="button" className="ctrl-fs" onClick={toggleFullscreen} aria-label="Celá obrazovka">
                <svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              <button type="button" className={`ctrl-sound${muted ? " is-muted" : ""}`} onClick={toggleMute} aria-label={muted ? "Zapnout zvuk" : "Vypnout zvuk"} aria-pressed={muted}>
                {muted ? (
                  <svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" /><path d="M16 9l5 6M21 9l-5 6" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" /></svg>
                ) : (
                  <svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" /><path d="M16 8.6a4 4 0 0 1 0 6.8M18.6 6a7 7 0 0 1 0 12" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" /></svg>
                )}
              </button>
            </div>
            <HeroPlayerBar
              enabled={controlsEnabled}
              expanded={barExpanded}
              onExpandedChange={setBarExpanded}
              currentTime={playerCurrentTime}
              duration={playerDuration}
              onSeek={seekTo}
              playbackRate={playbackRate}
              onPlaybackRateChange={changeSpeed}
              volume={volume}
              muted={muted}
              onVolumeChange={changeVolume}
              onMuteToggle={toggleMute}
            />
          </div>

          <div className="px-nowmeta">
            <p className="px-kicker">{tenantChannelLabel(displayChannel)}<span> · právě vysíláme</span></p>
            <h1 className="px-title">{displayTitle}</h1>
          </div>
        </section>

        {/* NA PROGRAMU */}
        {programItems.length > 0 ? (
          <section className="px-block" aria-labelledby="px-program">
            <div className="px-head">
              <span className="px-eyebrow">Na programu</span>
              <h2 id="px-program">Právě hraje</h2>
            </div>
            <div className="px-rail" ref={programRailRef}>
              {programItems.map((item, i) => {
                const isCurrent = Boolean(videoId) && item.videoId === videoId;
                return (
                  <button
                    key={`${item.videoId}-${i}`}
                    type="button"
                    className={`px-card${isCurrent ? " is-current" : ""}`}
                    ref={isCurrent ? currentCardRef : undefined}
                    onClick={() => {
                      onSelect(item);
                      scrollToHero();
                    }}
                  >
                    <span className="px-card-thumb">
                      {thumbFor(item) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumbFor(item)} alt="" loading="lazy" />
                      ) : null}
                      {isCurrent ? (
                        <span className="px-card-live">Právě hraje</span>
                      ) : (
                        <span className="px-card-play" aria-hidden="true">
                          <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                        </span>
                      )}
                    </span>
                    <span className="px-card-meta">
                      <span className="px-card-ch">{tenantChannelLabel(item.channelName)}</span>
                      <span className="px-card-title">{item.title}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}

        {/* KANÁLY */}
        {channels.length > 0 ? (
          <section className="px-block" aria-labelledby="px-channels">
            <div className="px-head">
              <span className="px-eyebrow">Zdroje</span>
              <h2 id="px-channels">Kanály</h2>
              <span className="px-count">{channels.length}</span>
            </div>
            {activeChannel ? (
              <div className="px-channel-detail" ref={channelDetailRef}>
                <p className="px-kicker">
                  {activeChannel.channelName}
                  <span> · nejnovější videa</span>
                </p>
                {channelLoading === activeChannel.channelName ? (
                  <p className="px-channel-note">Načítám nejnovější videa kanálu…</p>
                ) : activeChannelVideos.length > 0 ? (
                  <div className="px-rail">
                    {activeChannelVideos.map((video) => (
                      <button
                        key={`${activeChannel.channelName}-${video.videoId}`}
                        type="button"
                        className="px-card"
                        onClick={() => {
                          onSelectChannelVideo({ channelName: activeChannel.channelName, video });
                          scrollToHero();
                        }}
                      >
                        <span className="px-card-thumb">
                          {thumbFor(video) ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={thumbFor(video)} alt="" loading="lazy" />
                          ) : null}
                          <span className="px-card-play" aria-hidden="true">
                            <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                          </span>
                        </span>
                        <span className="px-card-meta">
                          <span className="px-card-ch">{activeChannel.channelName}</span>
                          <span className="px-card-title">{video.title}</span>
                          {premiereDateLabel(video.publishedAt) ? (
                            <span className="px-card-date">
                              Premiéra {premiereDateLabel(video.publishedAt)}
                            </span>
                          ) : null}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="px-channel-note">
                    {channelError[activeChannel.channelName] || "Kanál momentálně neposkytuje dostupná videa."}
                  </p>
                )}
              </div>
            ) : null}
            <div className="px-channel-grid">
              {channels.map((ch) => (
                <button
                  key={ch.channelName}
                  type="button"
                  className={`pxc${activeChannelName === ch.channelName ? " is-active" : ""}`}
                  aria-expanded={activeChannelName === ch.channelName}
                  onClick={() => {
                    setActiveChannelName((prev) => (prev === ch.channelName ? null : ch.channelName));
                    void loadChannelVideos(ch);
                  }}
                >
                  <ChannelAvatar name={ch.channelName} url={ch.avatarUrl} />
                  <span className="pxc-name">{ch.channelName}</span>
                </button>
              ))}
            </div>

          </section>
        ) : null}
      </main>

      <ProudXFooter />
    </div>
  );
}

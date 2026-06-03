"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { VeroxHeader } from "@/components/abj/VeroxHeader";
import { PlayoutStage } from "@/components/abj/playout/PlayoutStage";
import { usePlayoutLoop } from "@/components/abj/playout/usePlayoutLoop";
import type { LiveChannelGroup, LiveChannelVideo } from "@/components/abj/ChannelDirectory";
import type { DayProgram, ProgramItem } from "@/lib/epg-types";
import type { PlayoutSurface } from "@/lib/playout/types";

type HomePageProps = {
  days: DayProgram[];
  channels: LiveChannelGroup[];
  videoId: string | null;
  title: string;
  channelName: string;
  isLive: boolean;
  startSeconds?: number;
  remainingLabel: string;
  progressPercent: number;
  isFiller: boolean;
  continueFromSeconds?: number | null;
  onSelect: (item: ProgramItem) => void;
  onReturnToLive: () => void;
  onContinueFromSaved?: (seconds: number) => void;
  onPlaybackSample?: (sample: { videoId: string; positionSeconds: number; durationSeconds: number }) => void;
  onSelectChannelVideo: (payload: { channelName: string; video: LiveChannelVideo }) => void;
  engagementSlot?: ReactNode;
  reactionsSlot?: ReactNode;
};

type PlayerHandle = {
  getCurrentTime: () => number;
  getDuration: () => number;
  mute?: () => void;
  unMute?: () => void;
  playVideo?: () => void;
  pauseVideo?: () => void;
  seekTo?: (seconds: number, allowSeekAhead?: boolean) => void;
};

const DOT_COUNT = 7;

function thumbFor(item: ProgramItem): string {
  if (item.thumbnail && item.thumbnail.trim()) return item.thumbnail.trim();
  if (item.videoId) return `https://img.youtube.com/vi/${item.videoId}/hqdefault.jpg`;
  return "/placeholder-thumb.jpg";
}

// Landing dle finálního handoffu: hero + odznak, feature-summary, PRÁVĚ HRAJE
// (3 náhledy) + PRÁVĚ BĚŽÍ, KANÁLY. Vše napojené na reálná data.
export function HomePage({
  days,
  channels,
  videoId,
  title,
  channelName,
  isLive,
  startSeconds = 0,
  onSelect,
  onReturnToLive,
  onPlaybackSample,
  onSelectChannelVideo,
}: HomePageProps) {
  const heroRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<PlayerHandle | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const channelTrackRef = useRef<HTMLDivElement | null>(null);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(true);
  const [stageDot, setStageDot] = useState(0);
  const [channelDot, setChannelDot] = useState(0);
  const [pendingChannel, setPendingChannel] = useState<string | null>(null);

  const programItems = useMemo(
    () => days.flatMap((day) => day.items).filter((item) => Boolean(item.videoId)),
    [days],
  );

  // PRÁVĚ HRAJE: pokud je vybraný kanál (běží jeho video), ukaž videa z toho
  // kanálu; jinak default EPG program.
  const activeChannel = useMemo(
    () => channels.find((ch) => ch.channelName === channelName && ch.videos.length > 0) ?? null,
    [channels, channelName],
  );
  const stageItems = useMemo(() => {
    if (activeChannel) {
      return activeChannel.videos.slice(0, 12).map((video) => ({
        key: video.videoId,
        videoId: video.videoId,
        title: video.title,
        thumb: video.thumbnail || `https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`,
        onClick: () => onSelectChannelVideo({ channelName: activeChannel.channelName, video }),
      }));
    }
    return programItems.slice(0, 12).map((item, index) => ({
      key: `${item.videoId}-${index}`,
      videoId: item.videoId,
      title: item.title,
      thumb: thumbFor(item),
      onClick: () => onSelect(item),
    }));
  }, [activeChannel, programItems, onSelect, onSelectChannelVideo]);

  const offset = Math.max(0, Math.floor(startSeconds));

  // NONSTOP PLAYOUT: v živém (lineárním) režimu řídí přehrávání časovaná smyčka
  // (přepíná podle času, ne podle YouTube ENDED). Při vybraném VOD (isLive=false)
  // smyčka stojí a hrajeme zvolené video napřímo.
  const playout = usePlayoutLoop({
    enabled: isLive,
    initialBlock: isLive && videoId ? { videoId, title, offsetSeconds: offset } : null,
  });
  const heroSurface: PlayoutSurface | null = isLive
    ? playout.surface
    : videoId
      ? { kind: "youtube", videoId, startSeconds: offset, title }
      : null;
  const registerPlayer = useCallback((player: PlayerHandle | null) => {
    playerRef.current = player;
  }, []);

  const scrollStage = (dir: -1 | 1) => {
    const el = stageRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  const scrollChannels = (dir: -1 | 1) => {
    const el = channelTrackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  // Aktivní tečka = pozice scrollu napříč DOT_COUNT tečkami (carousel posun).
  useEffect(() => {
    const stageEl = stageRef.current;
    const trackEl = channelTrackRef.current;
    const dotFor = (el: HTMLDivElement | null): number => {
      if (!el) return 0;
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 1) return 0;
      const progress = Math.min(1, Math.max(0, el.scrollLeft / max));
      return Math.round(progress * (DOT_COUNT - 1));
    };
    const onStageScroll = () => setStageDot(dotFor(stageEl));
    const onTrackScroll = () => setChannelDot(dotFor(trackEl));
    onStageScroll();
    onTrackScroll();
    stageEl?.addEventListener("scroll", onStageScroll, { passive: true });
    trackEl?.addEventListener("scroll", onTrackScroll, { passive: true });
    window.addEventListener("resize", onStageScroll);
    window.addEventListener("resize", onTrackScroll);
    return () => {
      stageEl?.removeEventListener("scroll", onStageScroll);
      trackEl?.removeEventListener("scroll", onTrackScroll);
      window.removeEventListener("resize", onStageScroll);
      window.removeEventListener("resize", onTrackScroll);
    };
  }, [stageItems.length, channels.length]);

  // Výběr kanálu: pokud kanál nemá přednačtené video, doptáme se na nejnovější
  // přes /api/channel-latest, ať jdou spustit i kanály bez položek ve feedu.
  const selectChannel = async (ch: LiveChannelGroup) => {
    const firstVideo = ch.videos[0];
    if (firstVideo) {
      onSelectChannelVideo({ channelName: ch.channelName, video: firstVideo });
      return;
    }
    if (pendingChannel) return;
    if (!ch.channelId && !ch.channelUrl && !ch.channelName.trim()) return;

    setPendingChannel(ch.channelName);
    try {
      const params = new URLSearchParams();
      if (ch.channelId) params.set("channelId", ch.channelId);
      if (ch.channelUrl) params.set("channelUrl", ch.channelUrl);
      params.set("channelName", ch.channelName);
      params.set("limit", "1");

      const response = await fetch(`/api/channel-latest?${params.toString()}`, { cache: "no-store" });
      const payload = (await response.json().catch(() => ({}))) as {
        videos?: Array<{ videoId?: string; title?: string; thumbnail?: string; publishedAt?: string }>;
      };
      const latest = payload.videos?.find((video) => video.videoId?.trim() && video.title?.trim());
      if (latest?.videoId && latest.title) {
        onSelectChannelVideo({
          channelName: ch.channelName,
          video: {
            videoId: latest.videoId.trim(),
            title: latest.title.trim(),
            thumbnail: latest.thumbnail?.trim() || null,
            publishedAt: latest.publishedAt?.trim() || new Date(0).toISOString(),
          },
        });
      }
    } catch {
      // Tiché selhání — kanál bez dostupných videí prostě nespustíme.
    } finally {
      setPendingChannel(null);
    }
  };

  // Sledování pozice pro „pokračovat ve sledování" — jen u VOD (ne v živé smyčce,
  // kde se přehrávaný blok mění sám a videoId prop neodpovídá běžícímu videu).
  useEffect(() => {
    if (isLive || !videoId || !onPlaybackSample) return;
    const id = window.setInterval(() => {
      const p = playerRef.current;
      if (!p) return;
      const positionSeconds = Math.max(0, Math.floor(p.getCurrentTime()));
      const durationSeconds = Math.max(0, Math.floor(p.getDuration()));
      if (durationSeconds <= 0) return;
      onPlaybackSample({ videoId, positionSeconds, durationSeconds });
    }, 4000);
    return () => window.clearInterval(id);
  }, [isLive, onPlaybackSample, videoId]);

  const togglePlay = () => {
    const p = playerRef.current;
    if (!p) return;
    if (playing) p.pauseVideo?.();
    else p.playVideo?.();
    setPlaying(!playing);
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    const p = playerRef.current;
    if (!p) return;
    if (next) p.mute?.();
    else p.unMute?.();
  };

  const toggleFullscreen = () => {
    const el = heroRef.current as (HTMLDivElement & { webkitRequestFullscreen?: () => void }) | null;
    if (!el) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen?.();
      return;
    }
    if (el.requestFullscreen) void el.requestFullscreen();
    else el.webkitRequestFullscreen?.();
  };

  return (
    <div className="hf">
      <VeroxHeader active="zive" />
      <div className="double-rule header-rule" aria-hidden="true" />

      {/* Obsah pod hlavičkou — nosič oranžového gradientu vlevo (po dolní okraj) */}
      <div className="hf-body">
      {/* STAGE: na desktopu dvousloupec (feature vlevo, video vpravo) */}
      <div className="hf-stage">
      {/* HERO */}
      <section className="hero" aria-label="Živé vysílání">
        <div className="hero-media" ref={heroRef}>
          <PlayoutStage
            surface={heroSurface}
            muted={muted}
            onEnded={playout.signalEnded}
            onPlayerReady={registerPlayer}
            onPlayingChange={setPlaying}
          />
          {/* Záchytné pruhy: překryjí klikatelnou lištu YouTube (titulek nahoře,
              „Watch on YouTube"/sdílení dole), aby neodváděly diváky pryč.
              Vlastní ovládání (.hero-ctrls) je nad nimi. */}
          <span className="hero-guard hero-guard-top" aria-hidden="true" />
          <span className="hero-guard hero-guard-bottom" aria-hidden="true" />
          <div className="hero-ctrls">
            <button
              type="button"
              className="ctrl-play"
              onClick={togglePlay}
              aria-label={playing ? "Pozastavit" : "Přehrát"}
            >
              {playing ? (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="7" y="5" width="3.6" height="14" rx="1" />
                  <rect x="13.4" y="5" width="3.6" height="14" rx="1" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
            <button type="button" onClick={toggleFullscreen} aria-label="Celá obrazovka">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icons/ikona_to_full_scren.svg" alt="" />
            </button>
            <button
              type="button"
              className={`ctrl-sound${muted ? " is-muted" : ""}`}
              onClick={toggleMute}
              aria-label={muted ? "Zapnout zvuk" : "Vypnout zvuk"}
              aria-pressed={muted}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icons/ikona_sound_on.svg" alt="" />
            </button>
          </div>
        </div>
        <button type="button" className="live-badge" onClick={onReturnToLive} aria-label="Přepnout na živé vysílání">
          ŽIVÉ
          <br />
          VYSÍLÁNÍ
        </button>
      </section>

      {/* FEATURE SUMMARY */}
      <section className="feature-summary" aria-labelledby="hf-featured">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="comment-icon" src="/design/icons/ikona_komentovat.png" alt="" />
        <div className="feature-copy">
          <h1 id="hf-featured">{title}</h1>
          <p>{channelName}</p>
        </div>
      </section>
      </div>
      {/* /STAGE */}

      <div className="double-rule feature-rule" aria-hidden="true" />

      {/* PRÁVĚ HRAJE */}
      <section className="playing-now" aria-labelledby="hf-playing">
        <h2 id="hf-playing">PRÁVĚ HRAJE</h2>
        <div className="stage-wrap">
          <button
            type="button"
            className="stage-nav stage-prev"
            onClick={() => scrollStage(-1)}
            aria-label="Předchozí pořady"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="playing-stage" ref={stageRef} aria-label="Program">
            {stageItems.length === 0 ? (
              <>
                <div className="playing-image"><span className="playing-thumb" /></div>
                <div className="playing-image"><span className="playing-thumb" /></div>
                <div className="playing-image"><span className="playing-thumb" /></div>
              </>
            ) : (
              stageItems.map((it) => {
                const isCurrent = Boolean(videoId) && it.videoId === videoId;
                return (
                  <button
                    type="button"
                    key={it.key}
                    className={`playing-image${isCurrent ? " is-current" : ""}`}
                    onClick={it.onClick}
                    aria-label={it.title}
                  >
                    <span className="playing-thumb">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={it.thumb} alt="" loading="lazy" />
                    </span>
                    <span className="playing-title">{it.title}</span>
                  </button>
                );
              })
            )}
          </div>
          <button
            type="button"
            className="stage-nav stage-next"
            onClick={() => scrollStage(1)}
            aria-label="Další pořady"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <div className="dots" aria-hidden="true">
          {Array.from({ length: DOT_COUNT }).map((_, i) => (
            <span key={i} className={i === stageDot ? "active" : undefined} />
          ))}
        </div>
        <p className="status-label">
          <span />
          PRÁVĚ BĚŽÍ
        </p>
        <h3>{title}</h3>
        <p className="source-label">{channelName}</p>
      </section>

      <div className="double-rule channels-rule" aria-hidden="true" />

      {/* KANÁLY */}
      <section className="channels" aria-labelledby="hf-channels">
        <h2 id="hf-channels">KANÁLY</h2>
        <p>KLIKNĚTE NA VYBRANÝ KANÁL PRO ZOBRAZENÍ DETAILU.</p>
        <div className="stage-wrap">
          <button
            type="button"
            className="stage-nav stage-prev"
            onClick={() => scrollChannels(-1)}
            aria-label="Předchozí kanály"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="channel-track" ref={channelTrackRef} aria-label="Kanály">
            {channels.length === 0 ? (
              <article className="channel-card">
                <span className="ch-name">Připravujeme…</span>
              </article>
            ) : (
              channels.map((ch) => {
                const active = ch.channelName === channelName || ch.channelName === pendingChannel;
                const isPending = ch.channelName === pendingChannel;
                return (
                  <button
                    type="button"
                    key={ch.channelName}
                    className={`channel-card${active ? " channel-card-active" : ""}`}
                    onClick={() => void selectChannel(ch)}
                    aria-busy={isPending}
                    style={isPending ? { opacity: 0.65 } : undefined}
                  >
                    {ch.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="ch-avatar" src={ch.avatarUrl} alt="" />
                    ) : null}
                    <span className="ch-name">{ch.channelName}</span>
                  </button>
                );
              })
            )}
          </div>
          <button
            type="button"
            className="stage-nav stage-next"
            onClick={() => scrollChannels(1)}
            aria-label="Další kanály"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <div className="dots" aria-hidden="true">
          {Array.from({ length: DOT_COUNT }).map((_, i) => (
            <span key={i} className={i === channelDot ? "active" : undefined} />
          ))}
        </div>
      </section>
      </div>
      {/* /hf-body */}
    </div>
  );
}

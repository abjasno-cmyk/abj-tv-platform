"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import YouTube, { type YouTubeProps } from "react-youtube";

import { VeroxHeader } from "@/components/abj/VeroxHeader";
import type { LiveChannelGroup, LiveChannelVideo } from "@/components/abj/ChannelDirectory";
import type { DayProgram, ProgramItem } from "@/lib/epg-types";

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
};

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
  startSeconds = 0,
  onSelect,
  onReturnToLive,
  onPlaybackSample,
  onSelectChannelVideo,
}: HomePageProps) {
  const heroRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<PlayerHandle | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(true);

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

  const scrollStage = (dir: -1 | 1) => {
    const el = stageRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  const opts = useMemo<YouTubeProps["opts"]>(
    () => ({
      width: "100%",
      height: "100%",
      playerVars: {
        autoplay: 1,
        mute: muted ? 1 : 0,
        start: offset,
        rel: 0,
        modestbranding: 1,
        controls: 0,
        playsinline: 1,
        iv_load_policy: 3,
      },
    }),
    [muted, offset],
  );

  useEffect(() => {
    if (!videoId || !onPlaybackSample) return;
    const id = window.setInterval(() => {
      const p = playerRef.current;
      if (!p) return;
      const positionSeconds = Math.max(0, Math.floor(p.getCurrentTime()));
      const durationSeconds = Math.max(0, Math.floor(p.getDuration()));
      if (durationSeconds <= 0) return;
      onPlaybackSample({ videoId, positionSeconds, durationSeconds });
    }, 4000);
    return () => window.clearInterval(id);
  }, [onPlaybackSample, videoId]);

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
          {videoId ? (
            <YouTube
              key={`${videoId}-${muted ? "m" : "u"}-${offset}`}
              videoId={videoId}
              title={title}
              opts={opts}
              onReady={(e) => {
                playerRef.current = e.target as unknown as PlayerHandle;
                if (muted) playerRef.current.mute?.();
              }}
              onStateChange={(e) => {
                // YT.PlayerState: 1 = playing, 2 = paused
                if (e.data === 1) setPlaying(true);
                else if (e.data === 2) setPlaying(false);
              }}
            />
          ) : null}
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
              onClick={toggleMute}
              aria-label={muted ? "Zapnout zvuk" : "Vypnout zvuk"}
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
                <div className="playing-image" />
                <div className="playing-image" />
                <div className="playing-image" />
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
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={it.thumb} alt={it.title} loading="lazy" />
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
          {Array.from({ length: 7 }).map((_, i) => (
            <span key={i} className={i === 3 ? "active" : undefined} />
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
        <div className="channel-track" aria-label="Kanály">
          {channels.length === 0 ? (
            <article className="channel-card">
              <span className="ch-name">Připravujeme…</span>
            </article>
          ) : (
            channels.map((ch) => {
              const active = ch.channelName === channelName;
              const firstVideo = ch.videos[0];
              return (
                <button
                  type="button"
                  key={ch.channelName}
                  className={`channel-card${active ? " channel-card-active" : ""}`}
                  onClick={() => {
                    if (firstVideo) onSelectChannelVideo({ channelName: ch.channelName, video: firstVideo });
                  }}
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
        <div className="dots" aria-hidden="true">
          {Array.from({ length: 7 }).map((_, i) => (
            <span key={i} className={i === 3 ? "active" : undefined} />
          ))}
        </div>
      </section>
      </div>
      {/* /hf-body */}
    </div>
  );
}

"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import YouTube, { type YouTubeProps } from "react-youtube";

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
};

function thumbFor(item: ProgramItem): string {
  if (item.thumbnail && item.thumbnail.trim()) return item.thumbnail.trim();
  if (item.videoId) return `https://img.youtube.com/vi/${item.videoId}/hqdefault.jpg`;
  return "/placeholder-thumb.jpg";
}

function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "CH";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function HomePage({
  days,
  channels,
  videoId,
  title,
  channelName,
  isLive,
  startSeconds = 0,
  remainingLabel,
  onSelect,
  onReturnToLive,
  onPlaybackSample,
  onSelectChannelVideo,
}: HomePageProps) {
  const heroRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<PlayerHandle | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const chRef = useRef<HTMLDivElement | null>(null);
  const [muted, setMuted] = useState(true);

  const programItems = useMemo(
    () => days.flatMap((day) => day.items).filter((item) => Boolean(item.videoId)).slice(0, 14),
    [days],
  );
  const offset = Math.max(0, Math.floor(startSeconds));

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

  // Periodically report playback position (continue-watching / analytics).
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

  const nudge = (ref: React.RefObject<HTMLDivElement | null>, dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.min(el.clientWidth * 0.8, 420), behavior: "smooth" });
  };

  const dotCount = Math.min(7, Math.max(1, programItems.length));

  return (
    <div className="vx-live">
      {/* ŽIVĚ — hero */}
      <div className="hero" ref={heroRef}>
        {videoId ? (
          <YouTube
            key={`${videoId}-${muted ? "m" : "u"}-${offset}`}
            videoId={videoId}
            title={title}
            iframeClassName=""
            opts={opts}
            onReady={(e) => {
              playerRef.current = e.target as unknown as PlayerHandle;
              if (muted) playerRef.current.mute?.();
            }}
          />
        ) : null}
        <div className="hero-ctrls">
          <button type="button" onClick={toggleFullscreen} aria-label="Celá obrazovka">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/ikona_to_full_scren.svg" alt="" />
          </button>
          <button type="button" onClick={toggleMute} aria-label={muted ? "Zapnout zvuk" : "Vypnout zvuk"} style={{ opacity: muted ? 0.55 : 1 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/ikona_sound_on.svg" alt="" />
          </button>
        </div>
      </div>

      <div className="live-block">
        <div className="live-meta">
          <div className="komunita">
            <h3>KOMUNITA</h3>
            <p>ZDE NAPIŠTE ZPRÁVU</p>
            <input aria-label="Napsat zprávu do komunity" />
          </div>
          <div className="show-title">
            <h2>{title}</h2>
            <div className="author">{channelName}</div>
          </div>
          <div className="live-right">
            <button type="button" className="circle" onClick={onReturnToLive} aria-label="Přepnout na živé vysílání">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icons/ikona_zive_vysilani.svg" alt="ŽIVĚ VYSÍLÁNÍ" />
            </button>
            <div className="countdown">
              DO KONCE ZBÝVÁ : <b>{remainingLabel}</b>
            </div>
          </div>
        </div>

        <div className="vx-strip w75">
          <span />
          <span />
        </div>

        <h3 className="section-h">PRÁVĚ HRAJE</h3>
        <div className="carousel">
          <button type="button" className="chev left" onClick={() => nudge(trackRef, -1)} aria-label="Předchozí">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/ikona_sipka.svg" alt="" />
          </button>
          <div className="track" ref={trackRef}>
            {programItems.length === 0 ? (
              <div className="thumb" />
            ) : (
              programItems.map((item, idx) => (
                <button type="button" className="thumb" key={`${item.videoId}-${idx}`} onClick={() => onSelect(item)} aria-label={item.title}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={thumbFor(item)} alt={item.title} loading="lazy" />
                </button>
              ))
            )}
          </div>
          <button type="button" className="chev" onClick={() => nudge(trackRef, 1)} aria-label="Další">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/ikona_sipka.svg" alt="" />
          </button>
        </div>
        <div className="dots">
          {Array.from({ length: dotCount }).map((_, i) => (
            <i key={i} className={i === 0 ? "on" : undefined} />
          ))}
        </div>

        <section className="running">
          <div className="tag">PRÁVĚ BĚŽÍ</div>
          <h4>{title}</h4>
          <div className="src">{channelName}</div>
        </section>

        <div className="vx-strip">
          <span />
          <span />
        </div>
      </div>

      {/* KANÁLY */}
      <h3 className="section-h">KANÁLY</h3>
      <section className="channels">
        <div className="ch-track">
          <button type="button" className="chev left" onClick={() => nudge(chRef, -1)} aria-label="Předchozí kanály">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/ikona_sipka.svg" alt="" />
          </button>
          <div className="ch-list" ref={chRef}>
            {channels.length === 0 ? (
              <div className="ch-card">
                <span className="logo" />
                <span className="name">Připravujeme…</span>
              </div>
            ) : (
              channels.map((ch) => {
                const active = ch.channelName === channelName;
                const firstVideo = ch.videos[0];
                return (
                  <button
                    type="button"
                    key={ch.channelName}
                    className={`ch-card${active ? " active" : ""}`}
                    onClick={() => {
                      if (firstVideo) onSelectChannelVideo({ channelName: ch.channelName, video: firstVideo });
                    }}
                  >
                    <span className="logo">
                      {ch.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={ch.avatarUrl} alt="" />
                      ) : (
                        <span
                          style={{
                            color: "#fff",
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            display: "grid",
                            placeItems: "center",
                            width: "100%",
                            height: "100%",
                          }}
                        >
                          {initials(ch.channelName)}
                        </span>
                      )}
                    </span>
                    <span className="name">{ch.channelName}</span>
                  </button>
                );
              })
            )}
          </div>
          <button type="button" className="chev" onClick={() => nudge(chRef, 1)} aria-label="Další kanály">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/ikona_sipka.svg" alt="" />
          </button>
        </div>
        <p className="hint">KLIKNĚTE NA VYBRANÝ KANÁL PRO ZOBRAZENÍ DETAILU.</p>
      </section>
    </div>
  );
}

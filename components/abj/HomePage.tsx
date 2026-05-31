"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import YouTube, { type YouTubeProps } from "react-youtube";

import { useAuth } from "@/components/auth/AuthProvider";
import type { LiveChannelGroup, LiveChannelVideo } from "@/components/abj/ChannelDirectory";
import type { DayProgram, ProgramItem } from "@/lib/epg-types";

const DAYS = ["NEDĚLE", "PONDĚLÍ", "ÚTERÝ", "STŘEDA", "ČTVRTEK", "PÁTEK", "SOBOTA"];
const MONTHS_GEN = [
  "LEDNA", "ÚNORA", "BŘEZNA", "DUBNA", "KVĚTNA", "ČERVNA",
  "ČERVENCE", "SRPNA", "ZÁŘÍ", "ŘÍJNA", "LISTOPADU", "PROSINCE",
];

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

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
  const { isAuthenticated, openLoginModal } = useAuth();
  const heroRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<PlayerHandle | null>(null);
  const [muted, setMuted] = useState(true);
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const programItems = useMemo(
    () => days.flatMap((day) => day.items).filter((item) => Boolean(item.videoId)),
    [days],
  );
  const stage = programItems.slice(0, 3);
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

  const stagePos = ["playing-image-left", "playing-image-main", "playing-image-right"];

  return (
    <div className="hf">
      {/* HLAVIČKA dle handoffu */}
      <header className="hf-header" aria-label="VEROX">
        <Link href="/live" aria-label="VEROX — Mainstreamový detox">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="hf-logo" src="/handoff/assets/verox-logo.webp" alt="VEROX" />
        </Link>
        <p className="hf-tagline">MAINSTREAMOVÝ DETOX</p>
        <p className="hf-clock" suppressHydrationWarning>
          {pad(now.getHours())}:{pad(now.getMinutes())}
        </p>
        <p className="hf-date" suppressHydrationWarning>
          {DAYS[now.getDay()]} {now.getDate()}. {MONTHS_GEN[now.getMonth()]}
        </p>
        <nav className="hf-nav" aria-label="Hlavní navigace">
          <Link className="is-active" href="/live" aria-current="page">ŽIVĚ</Link>
          <Link href="/videa">VIDEA</Link>
          <Link href="/v-kostce">V KOSTCE</Link>
          <Link href="/muj-verox">MŮJ VEROX</Link>
          <a
            className="login-link"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (!isAuthenticated) openLoginModal({ reason: "Přihlaste se zdarma." });
            }}
          >
            PŘIHLÁSIT ZDARMA
          </a>
        </nav>
      </header>
      <div className="double-rule header-rule" aria-hidden="true" />

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
            />
          ) : null}
          <div className="hero-ctrls">
            <button type="button" onClick={toggleFullscreen} aria-label="Celá obrazovka">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icons/ikona_to_full_scren.svg" alt="" />
            </button>
            <button
              type="button"
              onClick={toggleMute}
              aria-label={muted ? "Zapnout zvuk" : "Vypnout zvuk"}
              style={{ opacity: muted ? 0.6 : 1 }}
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
        <img className="comment-icon" src="/handoff/assets/comment-icon.webp" alt="" />
        <div className="feature-copy">
          <h1 id="hf-featured">{title}</h1>
          <p>{channelName}</p>
        </div>
      </section>

      <div className="double-rule feature-rule" aria-hidden="true" />

      {/* PRÁVĚ HRAJE */}
      <section className="playing-now" aria-labelledby="hf-playing">
        <h2 id="hf-playing">PRÁVĚ HRAJE</h2>
        <div className="playing-stage" aria-label="Program">
          {stage.length === 0 ? (
            <>
              <div className="playing-image playing-image-left" />
              <div className="playing-image playing-image-main" />
              <div className="playing-image playing-image-right" />
            </>
          ) : (
            stage.map((item, i) => (
              <button
                type="button"
                key={`${item.videoId}-${i}`}
                className={`playing-image ${stagePos[i] ?? "playing-image-right"}`}
                onClick={() => onSelect(item)}
                aria-label={item.title}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={thumbFor(item)} alt={item.title} loading="lazy" />
              </button>
            ))
          )}
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
  );
}

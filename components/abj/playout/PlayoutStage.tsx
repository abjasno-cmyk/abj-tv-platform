"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import YouTube, { type YouTubeProps } from "react-youtube";

import {
  isValidYouTubeVideoId,
  type PlayerHandle,
  type PlayoutSourceCandidate,
  type PlayoutSurface,
} from "@/lib/playout/types";

interface PlayoutStageProps {
  surface: PlayoutSurface | null;
  muted: boolean;
  volume?: number;
  playbackRate?: number;
  // Stage hlásí dřívější konec videa (YouTube ENDED) — bonus trigger pro smyčku.
  onEnded: () => void;
  onPlayerReady?: (player: PlayerHandle | null) => void;
  onPlayingChange?: (playing: boolean) => void;
}

const IDENT_LOGO = "/design/brand/verox-logo.png";

function applyPlayerAudio(player: PlayerHandle, muted: boolean, volume: number) {
  const level = Math.min(100, Math.max(0, Math.round(volume)));
  if (muted || level === 0) {
    player.mute?.();
    return;
  }
  player.unMute?.();
  try {
    player.setVolume?.(level);
  } catch {
    // Některé embedy hlasitost nepodporují.
  }
}

export function PlayoutStage({
  surface,
  muted,
  volume = 100,
  playbackRate = 1,
  onEnded,
  onPlayerReady,
  onPlayingChange,
}: PlayoutStageProps) {
  const playerRef = useRef<PlayerHandle | null>(null);
  const isYouTube = surface?.kind === "youtube" && isValidYouTubeVideoId(surface.videoId);
  const primaryVideoId = isYouTube ? surface.videoId.trim() : "";
  const startSeconds = isYouTube ? surface.startSeconds : 0;
  const fallbacks: PlayoutSourceCandidate[] = isYouTube ? surface.fallbacks ?? [] : [];

  // Multi-source: index do fallbacků + případný embed-url fallback + krajní ident.
  const [activeVideoId, setActiveVideoId] = useState(primaryVideoId);
  const [, setFallbackIndex] = useState(0);
  const [fallbackEmbedUrl, setFallbackEmbedUrl] = useState<string | null>(null);
  const [sourcesExhausted, setSourcesExhausted] = useState(false);

  // Nový YouTube blok → reset fallback stavu. Adjust-state-during-render (React
  // doporučený vzor místo efektu se synchronním setState).
  const [trackedVideoId, setTrackedVideoId] = useState(primaryVideoId);
  if (isYouTube && primaryVideoId !== trackedVideoId) {
    setTrackedVideoId(primaryVideoId);
    setActiveVideoId(primaryVideoId);
    setFallbackIndex(0);
    setFallbackEmbedUrl(null);
    setSourcesExhausted(false);
  }

  // Stabilní opts (start dolaďujeme přes seekTo v onReady).
  const opts = useMemo<YouTubeProps["opts"]>(
    () => ({
      width: "100%",
      height: "100%",
      playerVars: {
        autoplay: 1,
        // Autoplay vždy startuje muted (politika prohlížeče), preferenci zvuku
        // aplikujeme hned po onReady — tím odmutování drží napříč videi.
        mute: 1,
        rel: 0,
        modestbranding: 1,
        controls: 0,
        playsinline: 1,
        iv_load_policy: 3,
      },
    }),
    [],
  );

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    applyPlayerAudio(player, muted, volume);
  }, [muted, volume, activeVideoId]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player?.setPlaybackRate) return;
    try {
      player.setPlaybackRate(playbackRate);
    } catch {
      // Některá videa (živý stream) rychlost nepodporují.
    }
  }, [playbackRate, activeVideoId]);

  // Když nehrajeme YouTube (ident/embed/weather), zruš referenci na (zničený)
  // přehrávač, aby na něj ovládání nesahalo.
  useEffect(() => {
    if (!isYouTube) {
      playerRef.current = null;
      onPlayerReady?.(null);
    }
  }, [isYouTube, onPlayerReady]);

  // SPOLEHLIVÁ detekce konce videa: YouTube ENDED je nespolehlivý (reklama,
  // embed restrikce, autoplay politika), proto aktivně pollujeme pozici vs délku.
  // Jakmile video reálně dojede, ohlásíme konec (smyčka přepne na další).
  const onEndedRef = useRef(onEnded);
  useEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);
  const endedFiredRef = useRef(false);
  useEffect(() => {
    endedFiredRef.current = false; // nové video → smí znovu ohlásit konec
  }, [activeVideoId]);
  const fireEnded = () => {
    if (endedFiredRef.current) return;
    endedFiredRef.current = true;
    onEndedRef.current();
  };
  useEffect(() => {
    if (!isYouTube) return;
    const id = window.setInterval(() => {
      const player = playerRef.current;
      if (!player) return;
      const duration = player.getDuration?.() ?? 0;
      const current = player.getCurrentTime?.() ?? 0;
      // duration > 0 = konečné VOD (živý stream má 0/roste → poll nezasáhne).
      if (duration > 0 && current >= duration - 1 && !endedFiredRef.current) {
        endedFiredRef.current = true;
        onEndedRef.current();
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [isYouTube, activeVideoId]);

  const advanceFallback = () => {
    // Index čteme z funkčního updateru, ať dva rychlé onError za sebou nepřeskočí
    // jeden zdroj (stale closure by jinak vzal stejný index dvakrát).
    setFallbackIndex((currentIndex) => {
      const next = fallbacks[currentIndex];
      if (!next) {
        setSourcesExhausted(true); // nic dalšího → krajní ident (smyčka jede dál na časovači)
        return currentIndex;
      }
      if (next.videoId && isValidYouTubeVideoId(next.videoId)) {
        setActiveVideoId(next.videoId.trim());
        setFallbackEmbedUrl(null);
      } else if (next.url) {
        setFallbackEmbedUrl(next.url);
      } else {
        setSourcesExhausted(true);
      }
      return currentIndex + 1;
    });
  };

  // ---- render dle surface ----
  if (!surface) {
    return <PlayoutIdent />;
  }

  if (surface.kind === "ident") {
    return <PlayoutIdent title={surface.title} />;
  }

  if (surface.kind === "embed") {
    return <PlayoutEmbed url={surface.url} />;
  }

  if (surface.kind === "weather") {
    return <PlayoutWeather label={surface.label} />;
  }

  // youtube (+ multi-source fallback)
  if (sourcesExhausted) {
    return <PlayoutIdent />;
  }
  if (fallbackEmbedUrl) {
    return <PlayoutEmbed url={fallbackEmbedUrl} />;
  }
  return (
    <YouTube
      key={activeVideoId}
      videoId={activeVideoId}
      title={surface.title}
      opts={opts}
      onReady={(event) => {
        const player = event.target as unknown as PlayerHandle;
        playerRef.current = player;
        onPlayerReady?.(player);
        applyPlayerAudio(player, muted, volume);
        if (startSeconds > 0) {
          window.setTimeout(() => player.seekTo?.(startSeconds, true), 300);
        }
        try {
          player.setPlaybackRate?.(playbackRate);
        } catch {
          // ignore unsupported rate on live streams
        }
      }}
      onStateChange={(event) => {
        if (event.data === 1) onPlayingChange?.(true);
        else if (event.data === 2) onPlayingChange?.(false);
        else if (event.data === 0) fireEnded(); // ENDED = bonusový (dřívější) konec
      }}
      onError={() => {
        // Embed zakázaný / video nedostupné / rate limit → zkus další zdroj.
        advanceFallback();
      }}
    />
  );
}

function PlayoutIdent({ title }: { title?: string }) {
  return (
    <div className="playout-ident" aria-label={title ?? "ABJ — pokračujeme"}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={IDENT_LOGO} alt="VEROX" className="playout-ident-logo" />
    </div>
  );
}

function PlayoutEmbed({ url }: { url: string }) {
  return (
    <iframe
      className="playout-embed"
      src={url}
      title="Panorama"
      allow="autoplay; fullscreen; encrypted-media"
      referrerPolicy="no-referrer-when-downgrade"
    />
  );
}

function PlayoutWeather({ label }: { label?: string }) {
  return (
    <div className="playout-weather">
      <span className="playout-weather-label">{label ?? "Počasí"}</span>
    </div>
  );
}

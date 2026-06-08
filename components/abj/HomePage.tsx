"use client";

import { LIVE_CHANNEL_VIDEO_DISPLAY_LIMIT } from "@/lib/liveChannelVideos";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { VeroxHeader } from "@/components/abj/VeroxHeader";
import { HeroPlayerBar, type PlaybackSpeed } from "@/components/abj/playout/HeroPlayerBar";
import { FollowChannelButton } from "@/components/auth/FollowChannelButton";
import { VideoCommentsDrawer } from "@/components/auth/VideoCommentsDrawer";
import { SaveVideoButton } from "@/components/auth/SaveVideoButton";
import { ChannelVideoTile } from "@/components/viewer/ChannelVideoTile";
import { ShareVideoButton } from "@/components/viewer/ShareVideoButton";
import { ViewerVideoBadges } from "@/components/viewer/ViewerVideoBadges";
import { useViewerVideoState } from "@/lib/viewer/useViewerVideoState";
import { normalizeChannelFollowId } from "@/lib/viewer/videoMetadata";
import { PlayoutStage } from "@/components/abj/playout/PlayoutStage";
import { usePlayoutLoop } from "@/components/abj/playout/usePlayoutLoop";
import { scrollHorizontalCarousel } from "@/lib/horizontalCarouselScroll";
import { clampSeekSeconds } from "@/lib/playerTime";
import type { LiveChannelGroup, LiveChannelVideo } from "@/components/abj/ChannelDirectory";
import type { DayProgram, ProgramItem } from "@/lib/epg-types";
import type { PlayerHandle, PlayoutSurface } from "@/lib/playout/types";

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
  onSelectChannelVideo: onSelectChannelVideoProp,
}: HomePageProps) {
  const [clientChannels, setClientChannels] = useState<LiveChannelGroup[]>([]);
  const displayChannels = channels.length > 0 ? channels : clientChannels;
  const heroRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<PlayerHandle | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const channelTrackRef = useRef<HTMLDivElement | null>(null);
  const currentItemRef = useRef<HTMLButtonElement | null>(null);
  // Zvuk: autoplay MUSÍ startovat muted (jinak ho prohlížeč zablokuje / video pauzne).
  // Po prvním odmutování (gesto uživatele) zvuk drží napříč všemi dalšími videi
  // (onReady aplikuje `muted` stav). Auto-odmutovat hned po načtení nelze — browser
  // to bez gesta zablokuje. Viz preference [[verox-videos-always-unmuted]].
  const [muted, setMuted] = useState(true);
  const [volume, setVolume] = useState(100);
  const [playing, setPlaying] = useState(true);
  const [stageDot, setStageDot] = useState(0);
  const [channelDot, setChannelDot] = useState(0);
  // Sekce KANÁLY: otevřený kanál + až 24 videí bez Shorts (detail panel pod lištou).
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [openChannelName, setOpenChannelName] = useState<string | null>(null);
  const [channelVideosByName, setChannelVideosByName] = useState<Record<string, LiveChannelVideo[]>>({});
  const [channelLoading, setChannelLoading] = useState<string | null>(null);
  const [channelError, setChannelError] = useState<Record<string, string>>({});
  const [playbackRate, setPlaybackRate] = useState<PlaybackSpeed>(1);
  const [playerCurrentTime, setPlayerCurrentTime] = useState(0);
  const [playerDuration, setPlayerDuration] = useState(0);
  const [playerBarExpanded, setPlayerBarExpanded] = useState(false);
  const { savedVideoIds, watchedVideoIds, setSaved } = useViewerVideoState();

  const onSelectChannelVideo = useCallback(
    (payload: { channelName: string; video: LiveChannelVideo }) => {
      setPlayerBarExpanded(true);
      onSelectChannelVideoProp(payload);
    },
    [onSelectChannelVideoProp],
  );

  useEffect(() => {
    if (channels.length > 0) return;
    let cancelled = false;
    void fetch("/api/live/channels", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload: { channels?: LiveChannelGroup[] }) => {
        if (cancelled) return;
        if (Array.isArray(payload.channels) && payload.channels.length > 0) {
          setClientChannels(payload.channels);
        }
      })
      .catch(() => {
        // Kanály zůstanou prázdné — sekce zobrazí fallback.
      });
    return () => {
      cancelled = true;
    };
  }, [channels.length]);

  const scrollToChannels = useCallback(() => {
    const target = document.getElementById("hf-channels");
    if (!target) return;
    const navHeader = document.querySelector("header");
    const headerOffset =
      navHeader instanceof HTMLElement ? Math.ceil(navHeader.getBoundingClientRect().height) + 10 : 78;
    const top = Math.max(0, window.scrollY + target.getBoundingClientRect().top - headerOffset);
    window.scrollTo({ top, behavior: "smooth" });
  }, []);

  const programItems = useMemo(
    () => days.flatMap((day) => day.items).filter((item) => Boolean(item.videoId)),
    [days],
  );

  const handleSelectProgram = useCallback(
    (item: ProgramItem) => {
      onSelect(item);
      if (item.type !== "live") setPlayerBarExpanded(true);
    },
    [onSelect],
  );

  // PRÁVĚ HRAJE = vždy PROGRAM (Bloky z Replitu / EPG), ne videa kanálu z hera.
  // Ukazujeme celý program dne (Replit jich servíruje ~50+), ne jen prvních pár —
  // strop 100 jen bezpečně omezí degradovaný 7denní buildEPG fallback.
  const stageItems = useMemo(() => {
    return programItems.slice(0, 100).map((item, index) => ({
      key: `${item.videoId}-${index}`,
      videoId: item.videoId,
      title: item.title,
      thumb: thumbFor(item),
      onClick: () => handleSelectProgram(item),
    }));
  }, [programItems, handleSelectProgram]);

  const offset = Math.max(0, Math.floor(startSeconds));

  // NONSTOP PLAYOUT: v živém (lineárním) režimu řídí přehrávání časovaná smyčka
  // (přepíná podle času, ne podle YouTube ENDED). Při vybraném VOD (isLive=false)
  // smyčka stojí a hrajeme zvolené video napřímo.
  // Destructure stabilní `signalEnded` (useCallback v hooku) — jinak by se
  // `handleStageEnded` invalidoval každý render kvůli novému `playout` objektu.
  const { surface: playoutSurface, signalEnded: playoutSignalEnded } = usePlayoutLoop({
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
  // Konec videa: v živém režimu je to bonusový dřívější trigger pro smyčku;
  // u VOD (vybrané video) dohrálo → vrať se na živý kanál (žádná slepá ulička).
  const handleStageEnded = useCallback(() => {
    if (isLive) playoutSignalEnded();
    else onReturnToLive();
  }, [isLive, playoutSignalEnded, onReturnToLive]);

  // Titulek/kanál pod hero sledují PRÁVĚ HRANÉ video (jinak by držely SSR úvodní).
  // Zdroj: titulek z bloku (engine) → dohledání podle video_id v EPG → SSR fallback.
  const epgInfoById = useMemo(() => {
    const map = new Map<string, { title: string; channelName: string }>();
    for (const day of days) {
      for (const item of day.items) {
        if (item.videoId) map.set(item.videoId, { title: item.title, channelName: item.channelName });
      }
    }
    return map;
  }, [days]);
  const currentVideoId = heroSurface?.kind === "youtube" ? heroSurface.videoId : null;
  const activeCommentVideoId = currentVideoId ?? videoId;
  const playerControlsEnabled = heroSurface?.kind === "youtube" && Boolean(activeCommentVideoId);
  const currentEpg = currentVideoId ? epgInfoById.get(currentVideoId) : null;
  const displayTitle =
    (heroSurface?.kind === "youtube" ? heroSurface.title : undefined) ?? currentEpg?.title ?? title;
  const displayChannel =
    (heroSurface?.kind === "youtube" ? heroSurface.channel : undefined) ?? currentEpg?.channelName ?? channelName;

  const scrollStage = (dir: -1 | 1) => {
    const el = stageRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  const scrollChannels = (dir: -1 | 1) => {
    const el = channelTrackRef.current;
    if (!el) return;
    scrollHorizontalCarousel(el, dir, { itemSelector: ".channel-card" });
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
  }, [stageItems.length, displayChannels.length]);

  // Vycentruj PRÁVĚ HRAJE na aktuálně hrané video (při startu i při každém přepnutí bloku).
  useEffect(() => {
    const id = window.setTimeout(() => {
      const el = currentItemRef.current;
      const container = stageRef.current;
      if (!el || !container) return;
      const elRect = el.getBoundingClientRect();
      const contRect = container.getBoundingClientRect();
      const delta = elRect.left - contRect.left - (contRect.width - elRect.width) / 2;
      container.scrollBy({ left: delta, behavior: "smooth" });
    }, 120);
    return () => window.clearTimeout(id);
  }, [currentVideoId, stageItems.length]);

  // Klik na kanál: otevři DETAIL PANEL a načti poslední videa kanálu (nepřehrává
  // se rovnou — klik na konkrétní video v panelu pak otevře HeroScreen). Kanály bez
  // přednačtených videí (např. Datarun) si je doptají přímo přes /api/channel-latest
  // (YouTube), ať jdou taky zobrazit.
  const selectChannel = async (ch: LiveChannelGroup) => {
    // Toggle: druhý klik na otevřený kanál panel zavře.
    if (openChannelName === ch.channelName) {
      setOpenChannelName(null);
      return;
    }
    setOpenChannelName(ch.channelName);

    if (ch.videos.length > 0) {
      setChannelVideosByName((prev) => ({
        ...prev,
        [ch.channelName]: ch.videos.slice(0, LIVE_CHANNEL_VIDEO_DISPLAY_LIMIT),
      }));
      setPlayerBarExpanded(true);
      return;
    }
    if (channelVideosByName[ch.channelName]) return; // už načteno
    if (!ch.channelId && !ch.channelUrl && !ch.channelName.trim()) return;

    setChannelLoading(ch.channelName);
    setChannelError((prev) => ({ ...prev, [ch.channelName]: "" }));
    try {
      const params = new URLSearchParams();
      if (ch.channelId) params.set("channelId", ch.channelId);
      if (ch.channelUrl) params.set("channelUrl", ch.channelUrl);
      params.set("channelName", ch.channelName);
      params.set("limit", String(LIVE_CHANNEL_VIDEO_DISPLAY_LIMIT));

      const response = await fetch(`/api/channel-latest?${params.toString()}`, { cache: "no-store" });
      const payload = (await response.json().catch(() => ({}))) as {
        videos?: Array<{ videoId?: string; title?: string; thumbnail?: string; publishedAt?: string }>;
      };
      const videos = (payload.videos ?? [])
        .map((video): LiveChannelVideo | null => {
          const videoId = video.videoId?.trim();
          const title = video.title?.trim();
          if (!videoId || !title) return null;
          return {
            videoId,
            title,
            thumbnail: video.thumbnail?.trim() || null,
            publishedAt: video.publishedAt?.trim() || new Date(0).toISOString(),
          };
        })
        .filter((video): video is LiveChannelVideo => Boolean(video))
        .slice(0, LIVE_CHANNEL_VIDEO_DISPLAY_LIMIT);
      setChannelVideosByName((prev) => ({ ...prev, [ch.channelName]: videos }));
      if (videos.length > 0) setPlayerBarExpanded(true);
      if (videos.length === 0) {
        setChannelError((prev) => ({ ...prev, [ch.channelName]: "Kanál teď nemá dostupná videa." }));
      }
    } catch {
      setChannelError((prev) => ({ ...prev, [ch.channelName]: "Videa kanálu se nepodařilo načíst." }));
    } finally {
      setChannelLoading(null);
    }
  };

  // Pozice přehrávače pro vlastní posuvník / čas (YouTube iframe, controls:0).
  useEffect(() => {
    if (!playerControlsEnabled) {
      setPlayerCurrentTime(0);
      setPlayerDuration(0);
      return;
    }
    const id = window.setInterval(() => {
      const player = playerRef.current;
      if (!player) return;
      const duration = Math.max(0, Math.floor(player.getDuration?.() ?? 0));
      const current = Math.max(0, Math.floor(player.getCurrentTime?.() ?? 0));
      setPlayerDuration(duration);
      setPlayerCurrentTime(current);
    }, 500);
    return () => window.clearInterval(id);
  }, [playerControlsEnabled, currentVideoId]);

  const seekPlayerTo = useCallback(
    (seconds: number) => {
      const player = playerRef.current;
      if (!player?.seekTo) return;
      const target = clampSeekSeconds(seconds, playerDuration);
      player.seekTo(target, true);
      setPlayerCurrentTime(target);
    },
    [playerDuration],
  );

  useEffect(() => {
    if (!playerControlsEnabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT")
      ) {
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        seekPlayerTo(playerCurrentTime - (event.shiftKey ? 30 : 10));
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        seekPlayerTo(playerCurrentTime + (event.shiftKey ? 30 : 10));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [playerControlsEnabled, playerCurrentTime, seekPlayerTo]);

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

  const applyAudioToPlayer = useCallback((nextMuted: boolean, nextVolume: number) => {
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
      // ignore
    }
  }, []);

  const handleVolumeChange = useCallback(
    (next: number) => {
      const level = Math.min(100, Math.max(0, Math.round(next)));
      setVolume(level);
      if (level === 0) {
        setMuted(true);
        applyAudioToPlayer(true, 0);
        return;
      }
      setMuted(false);
      applyAudioToPlayer(false, level);
    },
    [applyAudioToPlayer],
  );

  const toggleMute = useCallback(() => {
    if (muted) {
      const restore = volume > 0 ? volume : 100;
      if (volume <= 0) setVolume(100);
      setMuted(false);
      applyAudioToPlayer(false, restore);
      return;
    }
    setMuted(true);
    applyAudioToPlayer(true, volume);
  }, [muted, volume, applyAudioToPlayer]);

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
      <VeroxHeader active="zive" showAudience />
      <div className="double-rule header-rule" aria-hidden="true" />

      {/* Obsah pod hlavičkou — nosič oranžového gradientu vlevo (po dolní okraj) */}
      <div className="hf-body">
      {/* STAGE: na desktopu dvousloupec (feature vlevo, video vpravo) */}
      <div className="hf-stage">
      {/* HERO */}
      <section id="live-player-shell" className="hero" aria-label="Živé vysílání">
        <div className="hero-media" ref={heroRef}>
          <PlayoutStage
            surface={heroSurface}
            muted={muted}
            volume={volume}
            playbackRate={playbackRate}
            onEnded={handleStageEnded}
            onPlayerReady={registerPlayer}
            onPlayingChange={setPlaying}
          />
          {/* Záchytný overlay přes celé video: pohltí VŠECHNY myší události, takže
              se hover ovládání YouTube (titulek, sdílení, „More videos", logo)
              vůbec nezobrazí a nic neodvede diváka pryč. Jediný ovladač jsou naše
              3 tlačítka v .hero-ctrls (z-index nad guardem). */}
          <span className="hero-guard" aria-hidden="true" />
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
            <button type="button" className="ctrl-fs" onClick={toggleFullscreen} aria-label="Celá obrazovka">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              type="button"
              className={`ctrl-sound${muted ? " is-muted" : ""}`}
              onClick={toggleMute}
              aria-label={muted ? "Zapnout zvuk" : "Vypnout zvuk"}
              aria-pressed={muted}
            >
              {muted ? (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
                  <path d="M16 9l5 6M21 9l-5 6" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
                  <path d="M16 8.6a4 4 0 0 1 0 6.8M18.6 6a7 7 0 0 1 0 12" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
                </svg>
              )}
            </button>
          </div>
          <HeroPlayerBar
            enabled={playerControlsEnabled}
            expanded={playerBarExpanded}
            onExpandedChange={setPlayerBarExpanded}
            currentTime={playerCurrentTime}
            duration={playerDuration}
            onSeek={seekPlayerTo}
            playbackRate={playbackRate}
            onPlaybackRateChange={setPlaybackRate}
            volume={volume}
            muted={muted}
            onVolumeChange={handleVolumeChange}
            onMuteToggle={toggleMute}
            onScrollToChannels={displayChannels.length > 0 ? scrollToChannels : undefined}
          />
        </div>
        <button type="button" className="live-badge" onClick={onReturnToLive} aria-label="Přepnout na živé vysílání">
          ŽIVÉ
          <br />
          VYSÍLÁNÍ
        </button>
      </section>

      {/* FEATURE SUMMARY */}
      <section className="feature-summary" aria-labelledby="hf-featured">
        <button
          type="button"
          className="comment-icon-btn"
          onClick={() => setCommentsOpen(true)}
          aria-label="Otevřít komentáře"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="comment-icon" src="/design/icons/ikona_komentovat.png" alt="" />
        </button>
        <div className="feature-copy">
          <h1 id="hf-featured">{displayTitle}</h1>
        <p>{displayChannel}</p>
        {activeCommentVideoId ? (
          <div className="hero-save-row nazory-detail-actions">
            <SaveVideoButton
              videoId={activeCommentVideoId}
              title={displayTitle}
              channelName={displayChannel}
              thumbnailUrl={`https://img.youtube.com/vi/${activeCommentVideoId}/hqdefault.jpg`}
              saved={savedVideoIds.has(activeCommentVideoId)}
              onSavedChange={(nextSaved) => setSaved(activeCommentVideoId, nextSaved)}
            />
            <ShareVideoButton videoId={activeCommentVideoId} />
            <ViewerVideoBadges
              watched={watchedVideoIds.has(activeCommentVideoId)}
              saved={savedVideoIds.has(activeCommentVideoId)}
            />
          </div>
        ) : null}
        {displayChannels.length > 0 ? (
          <p className="hero-pick-hint">
            <button type="button" className="hero-pick-hint-btn" onClick={scrollToChannels}>
              Vyberte jiné video v sekci KANÁLY níže ↓
            </button>
          </p>
        ) : null}
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
                // „Právě hrané" = blok, který reálně běží v hero (sleduje playout smyčku).
                const isCurrent = Boolean(currentVideoId) && it.videoId === currentVideoId;
                return (
                  <button
                    type="button"
                    key={it.key}
                    ref={isCurrent ? currentItemRef : undefined}
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
        <h3>{displayTitle}</h3>
        <p className="source-label">{displayChannel}</p>
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
            {displayChannels.length === 0 ? (
              <article className="channel-card">
                <span className="ch-name">Připravujeme…</span>
              </article>
            ) : (
              displayChannels.map((ch) => {
                const active = ch.channelName === openChannelName;
                const isLoading = ch.channelName === channelLoading;
                return (
                  <button
                    type="button"
                    key={ch.channelName}
                    className={`channel-card${active ? " channel-card-active" : ""}`}
                    onClick={() => void selectChannel(ch)}
                    aria-busy={isLoading}
                    aria-expanded={active}
                    style={isLoading ? { opacity: 0.65 } : undefined}
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

        {/* DETAIL PANEL vybraného kanálu — poslední videa, klik otevře v HeroScreen. */}
        {openChannelName ? (
          <div className="channel-detail" aria-live="polite">
            {(() => {
              const openChannel = displayChannels.find((ch) => ch.channelName === openChannelName);
              if (!openChannel) return null;
              return (
                <div className="channel-detail-head">
                  <p className="channel-detail-label">Aktivní kanál</p>
                  <div className="channel-detail-head-row">
                    <p className="channel-detail-name">{openChannel.channelName}</p>
                    <FollowChannelButton
                      channelId={normalizeChannelFollowId(openChannel.channelId, openChannel.channelName)}
                      channelName={openChannel.channelName}
                    />
                  </div>
                </div>
              );
            })()}
            {channelLoading === openChannelName ? (
              <p className="channel-detail-info">Načítám nejnovější videa…</p>
            ) : (channelVideosByName[openChannelName]?.length ?? 0) > 0 ? (
              <div className="channel-videos">
                {channelVideosByName[openChannelName]!.map((video) => (
                  <ChannelVideoTile
                    key={video.videoId}
                    video={video}
                    channelName={openChannelName}
                    saved={savedVideoIds.has(video.videoId)}
                    watched={watchedVideoIds.has(video.videoId)}
                    onSelect={() => onSelectChannelVideo({ channelName: openChannelName, video })}
                    onSavedChange={(nextSaved) => setSaved(video.videoId, nextSaved)}
                  />
                ))}
              </div>
            ) : (
              <p className="channel-detail-info">
                {channelError[openChannelName] || "Tento kanál teď nemá dostupná videa."}
              </p>
            )}
          </div>
        ) : null}

        <div className="dots" aria-hidden="true">
          {Array.from({ length: DOT_COUNT }).map((_, i) => (
            <span key={i} className={i === channelDot ? "active" : undefined} />
          ))}
        </div>
      </section>
      </div>
      {/* /hf-body */}
      <VideoCommentsDrawer
        open={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        videoId={activeCommentVideoId}
        videoTitle={displayTitle}
      />
    </div>
  );
}

"use client";

import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from "react";

import type { ContextClaim } from "@/lib/contextLayerApi";
import { formatPlayerClock } from "@/lib/playerTime";
import { findSeekSecondsByTextQuery } from "@/lib/playerSeek";

export const PLAYBACK_SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;
export type PlaybackSpeed = (typeof PLAYBACK_SPEED_OPTIONS)[number];

type HeroPlayerBarProps = {
  enabled: boolean;
  currentTime: number;
  duration: number;
  onSeek: (seconds: number) => void;
  playbackRate: PlaybackSpeed;
  onPlaybackRateChange: (rate: PlaybackSpeed) => void;
  contextClaims: ContextClaim[];
  contextLoading: boolean;
};

export function HeroPlayerBar({
  enabled,
  currentTime,
  duration,
  onSeek,
  playbackRate,
  onPlaybackRateChange,
  contextClaims,
  contextLoading,
}: HeroPlayerBarProps) {
  const searchId = useId();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMessage, setSearchMessage] = useState("");
  const scrubbingRef = useRef(false);
  const [scrubValue, setScrubValue] = useState(0);

  const canScrub = enabled && duration > 0;
  const progressPercent = canScrub ? Math.min(100, (currentTime / duration) * 100) : 0;

  useEffect(() => {
    if (!scrubbingRef.current) setScrubValue(currentTime);
  }, [currentTime]);

  const speedOptions = useMemo(
    () =>
      PLAYBACK_SPEED_OPTIONS.map((rate) => ({
        rate,
        label: rate === 1 ? "1×" : `${rate}×`,
      })),
    [],
  );

  const runTextSeek = () => {
    const query = searchQuery.trim();
    if (!query) {
      setSearchMessage("Napište slovo nebo větu z videa.");
      return;
    }
    const target = findSeekSecondsByTextQuery(contextClaims, query);
    if (target === null) {
      setSearchMessage(
        contextLoading
          ? "Načítám kontext videa… zkuste to za chvíli."
          : contextClaims.length === 0
            ? "Pro toto video zatím nemáme textový kontext — použijte posuvník nebo tlačítka −10 s / +10 s."
            : "Pasáž nenalezena. Zkuste kratší výraz nebo jiné slovo.",
      );
      return;
    }
    onSeek(target);
    setSearchMessage(`Přeskočeno na ${formatPlayerClock(target)}.`);
  };

  if (!enabled) return null;

  return (
    <div className="hero-player-bar" aria-label="Ovládání přehrávání">
      <div className="hero-player-row hero-player-row--transport">
        <button type="button" className="hero-player-skip" onClick={() => onSeek(currentTime - 10)} aria-label="Zpět 10 sekund">
          −10 s
        </button>
        <button type="button" className="hero-player-skip" onClick={() => onSeek(currentTime - 30)} aria-label="Zpět 30 sekund">
          −30 s
        </button>

        <div className="hero-player-scrub-wrap">
          <input
            type="range"
            className="hero-player-scrub"
            min={0}
            max={Math.max(1, Math.floor(duration))}
            step={1}
            value={canScrub ? scrubValue : 0}
            disabled={!canScrub}
            aria-valuemin={0}
            aria-valuemax={Math.max(0, Math.floor(duration))}
            aria-valuenow={Math.floor(scrubValue)}
            aria-label="Pozice ve videu"
            style={{ "--hero-progress": `${progressPercent}%` } as CSSProperties}
            onPointerDown={() => {
              scrubbingRef.current = true;
            }}
            onPointerUp={() => {
              scrubbingRef.current = false;
            }}
            onInput={(event) => {
              const next = Number(event.currentTarget.value);
              setScrubValue(next);
              onSeek(next);
            }}
          />
          <div className="hero-player-times" aria-hidden="true">
            <span>{formatPlayerClock(currentTime)}</span>
            <span>{duration > 0 ? formatPlayerClock(duration) : "--:--"}</span>
          </div>
        </div>

        <button type="button" className="hero-player-skip" onClick={() => onSeek(currentTime + 10)} aria-label="Vpřed 10 sekund">
          +10 s
        </button>
        <button type="button" className="hero-player-skip" onClick={() => onSeek(currentTime + 30)} aria-label="Vpřed 30 sekund">
          +30 s
        </button>

        <label className="hero-player-speed" htmlFor={`${searchId}-speed`}>
          <span className="sr-only">Rychlost přehrávání</span>
          <select
            id={`${searchId}-speed`}
            value={playbackRate}
            onChange={(event) => onPlaybackRateChange(Number(event.target.value) as PlaybackSpeed)}
            aria-label="Rychlost přehrávání"
          >
            {speedOptions.map(({ rate, label }) => (
              <option key={rate} value={rate}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="hero-player-row hero-player-row--search">
        <label className="hero-player-search-label" htmlFor={`${searchId}-query`}>
          Najít pasáž
        </label>
        <input
          id={`${searchId}-query`}
          type="search"
          className="hero-player-search-input"
          placeholder="Slovo nebo věta z videa…"
          value={searchQuery}
          onChange={(event) => {
            setSearchQuery(event.target.value);
            if (searchMessage) setSearchMessage("");
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              runTextSeek();
            }
          }}
        />
        <button type="button" className="hero-player-search-btn" onClick={runTextSeek}>
          Přejít
        </button>
        {searchMessage ? <p className="hero-player-search-msg">{searchMessage}</p> : null}
      </div>
    </div>
  );
}

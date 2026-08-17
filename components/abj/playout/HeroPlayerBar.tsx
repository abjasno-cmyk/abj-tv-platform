"use client";

import { useId, useMemo, useState, type CSSProperties } from "react";

import { LOCALE_CS, type VeroxLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";
import { formatPlayerClock } from "@/lib/playerTime";

export const PLAYBACK_SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;
export type PlaybackSpeed = (typeof PLAYBACK_SPEED_OPTIONS)[number];

type HeroPlayerBarProps = {
  enabled: boolean;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  currentTime: number;
  duration: number;
  onSeek: (seconds: number) => void;
  playbackRate: PlaybackSpeed;
  onPlaybackRateChange: (rate: PlaybackSpeed) => void;
  volume: number;
  muted: boolean;
  onVolumeChange: (volume: number) => void;
  onMuteToggle: () => void;
  onScrollToChannels?: () => void;
  locale?: VeroxLocale;
};

export function HeroPlayerBar({
  enabled,
  expanded,
  onExpandedChange,
  currentTime,
  duration,
  onSeek,
  playbackRate,
  onPlaybackRateChange,
  volume,
  muted,
  onVolumeChange,
  onMuteToggle,
  onScrollToChannels,
  locale = LOCALE_CS,
}: HeroPlayerBarProps) {
  const controlId = useId();
  const labels = getDictionary(locale).live.player;
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubValue, setScrubValue] = useState(0);
  const rangeValue = isScrubbing ? scrubValue : currentTime;

  const canScrub = enabled && duration > 0;
  const progressPercent = canScrub ? Math.min(100, (currentTime / duration) * 100) : 0;

  const speedOptions = useMemo(
    () =>
      PLAYBACK_SPEED_OPTIONS.map((rate) => ({
        rate,
        label: rate === 1 ? "1×" : `${rate}×`,
      })),
    [],
  );

  if (!enabled) return null;

  const timeLabel = `${formatPlayerClock(currentTime)} / ${duration > 0 ? formatPlayerClock(duration) : "--:--"}`;

  return (
    <div
      className={`hero-player-bar${expanded ? " hero-player-bar--expanded" : " hero-player-bar--collapsed"}`}
      aria-label={labels.controls}
    >
      <div className="hero-player-toolbar">
        <button
          type="button"
          className="hero-player-toggle"
          onClick={() => onExpandedChange(!expanded)}
          aria-expanded={expanded}
          aria-controls={`${controlId}-panel`}
        >
          <span className="hero-player-toggle-text hero-player-toggle-text--desktop">
            {expanded ? labels.hideControls : labels.showControls}
          </span>
          <span className="hero-player-toggle-text hero-player-toggle-text--mobile">
            {expanded ? labels.hide : labels.controlsShort}
          </span>
          <span className="hero-player-toggle-meta" aria-hidden="true">
            {timeLabel}
          </span>
          <span className="hero-player-toggle-chevron" aria-hidden="true">
            {expanded ? "▾" : "▴"}
          </span>
        </button>
        {!expanded && onScrollToChannels ? (
          <button
            type="button"
            className="hero-player-pick-video"
            onClick={onScrollToChannels}
            aria-label={labels.chooseAnotherVideoAria}
          >
            {labels.chooseAnotherVideo}
          </button>
        ) : null}
      </div>

      {expanded ? (
        <div id={`${controlId}-panel`} className="hero-player-panel">
          <div className="hero-player-row hero-player-row--transport">
            <button
              type="button"
              className="hero-player-skip"
              onClick={() => onSeek(currentTime - 10)}
              aria-label={labels.back10}
            >
              −10 s
            </button>
            <button
              type="button"
              className="hero-player-skip"
              onClick={() => onSeek(currentTime - 30)}
              aria-label={labels.back30}
            >
              −30 s
            </button>

            <div className="hero-player-scrub-wrap">
              <input
                type="range"
                className="hero-player-scrub"
                min={0}
                max={Math.max(1, Math.floor(duration))}
                step={1}
                value={canScrub ? rangeValue : 0}
                disabled={!canScrub}
                aria-valuemin={0}
                aria-valuemax={Math.max(0, Math.floor(duration))}
                aria-valuenow={Math.floor(rangeValue)}
                aria-label={labels.position}
                style={{ "--hero-progress": `${progressPercent}%` } as CSSProperties}
                onPointerDown={() => {
                  setIsScrubbing(true);
                  setScrubValue(currentTime);
                }}
                onPointerUp={() => {
                  setIsScrubbing(false);
                }}
                onPointerCancel={() => {
                  setIsScrubbing(false);
                }}
                onInput={(event) => {
                  const next = Number(event.currentTarget.value);
                  setScrubValue(next);
                  onSeek(next);
                }}
              />
            </div>

            <button
              type="button"
              className="hero-player-skip"
              onClick={() => onSeek(currentTime + 10)}
              aria-label={labels.forward10}
            >
              +10 s
            </button>
            <button
              type="button"
              className="hero-player-skip"
              onClick={() => onSeek(currentTime + 30)}
              aria-label={labels.forward30}
            >
              +30 s
            </button>

            <label className="hero-player-speed" htmlFor={`${controlId}-speed`}>
              <span className="sr-only">{labels.playbackSpeed}</span>
              <select
                id={`${controlId}-speed`}
                value={playbackRate}
                onChange={(event) => onPlaybackRateChange(Number(event.target.value) as PlaybackSpeed)}
                aria-label={labels.playbackSpeed}
              >
                {speedOptions.map(({ rate, label }) => (
                  <option key={rate} value={rate}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="hero-player-row hero-player-row--volume">
            <button
              type="button"
              className={`hero-player-mute${muted ? " is-muted" : ""}`}
              onClick={onMuteToggle}
              aria-label={muted ? labels.unmute : labels.mute}
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
            <label className="hero-player-volume" htmlFor={`${controlId}-volume`}>
              <span className="hero-player-volume-label">{labels.volume}</span>
              <input
                id={`${controlId}-volume`}
                type="range"
                className="hero-player-volume-slider"
                min={0}
                max={100}
                step={1}
                value={volume}
                onChange={(event) => onVolumeChange(Number(event.target.value))}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={volume}
                aria-label={labels.volume}
              />
              <span className="hero-player-volume-value" aria-hidden="true">
                {muted ? "0" : volume}%
              </span>
            </label>
          </div>
        </div>
      ) : null}
    </div>
  );
}

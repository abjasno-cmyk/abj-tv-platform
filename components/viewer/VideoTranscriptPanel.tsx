"use client";

import { useCallback, useEffect, useState } from "react";

import { useVideoTranscriptPoll } from "@/hooks/useVideoTranscriptPoll";
import {
  hasTranscriptOriginal,
  isTranscriptPending,
  resolveDisplayedTranscript,
  type TranscriptResponse,
} from "@/lib/transcriptTypes";

type VideoTranscriptPanelProps = {
  open: boolean;
  onClose: () => void;
  videoId: string | null;
  videoTitle?: string;
};

type TranscriptViewMode = "translation" | "original";

function TranscriptParagraphs({ text }: { text: string }) {
  const paragraphs = text.split(/\n\n+/).map((part) => part.trim()).filter(Boolean);
  if (paragraphs.length === 0) return null;

  return (
    <div className="vx-transcript-paragraphs">
      {paragraphs.map((paragraph, index) => (
        <p key={index}>{paragraph}</p>
      ))}
    </div>
  );
}

function isTranscriptPreparing(
  response: TranscriptResponse | null,
  phase: "idle" | "loading" | "polling" | "done",
  hardTimedOut: boolean,
): boolean {
  if (hardTimedOut) return false;
  if (phase === "loading" && !response) return true;
  return response?.status === "processing";
}

function preparingHint(softTimedOut: boolean): string | null {
  if (!softTimedOut) return null;
  return "Trvá to déle než obvykle, počkejte prosím…";
}

function panelMessage(response: TranscriptResponse | null, hardTimedOut: boolean): string {
  if (!response) return "Přepis se nepodařilo načíst.";

  switch (response.status) {
    case "ready":
      return response.transcript?.trim() || response.transcript_original?.trim() ? "" : "Přepis je prázdný.";
    case "processing":
      if (hardTimedOut) {
        return "Přepis se stále připravuje. Zkuste to prosím znovu za chvíli.";
      }
      return "";
    case "not_ready_live":
      return "Přepis bude po skončení vysílání.";
    case "unavailable":
      return "Přepis není k dispozici.";
    default:
      return "Přepis není k dispozici.";
  }
}

export function VideoTranscriptPanel({ open, onClose, videoId, videoTitle }: VideoTranscriptPanelProps) {
  const { response, phase, softTimedOut, hardTimedOut, retry } = useVideoTranscriptPoll(videoId, open);
  const [viewMode, setViewMode] = useState<TranscriptViewMode>("translation");

  useEffect(() => {
    if (open) setViewMode("translation");
  }, [open, videoId]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [handleKeyDown, open]);

  if (!open) return null;

  const preparing = isTranscriptPreparing(response, phase, hardTimedOut);
  const message = panelMessage(response, hardTimedOut);
  const showOriginalToggle = Boolean(response && hasTranscriptOriginal(response));
  const displayedTranscript =
    response?.status === "ready" ? resolveDisplayedTranscript(response, viewMode) : "";
  const showTranscript = response?.status === "ready" && Boolean(displayedTranscript);
  const showRetry =
    (hardTimedOut && Boolean(response && isTranscriptPending(response.status))) || (!response && phase === "done");

  return (
    <div className="vx-transcript-panel" role="presentation">
      <button type="button" className="vx-transcript-panel-backdrop" aria-label="Zavřít přepis" onClick={onClose} />
      <aside
        className="vx-transcript-panel-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="vx-transcript-panel-title"
      >
        <header className="vx-transcript-panel-head">
          <div>
            <h2 id="vx-transcript-panel-title">Přepis videa</h2>
            {videoTitle ? <p className="vx-transcript-panel-subtitle">{videoTitle}</p> : null}
          </div>
          <button type="button" className="vx-transcript-panel-close" onClick={onClose} aria-label="Zavřít">
            ×
          </button>
        </header>
        <div className="vx-transcript-panel-body">
          {showOriginalToggle ? (
            <div className="vx-transcript-panel-toggle" role="tablist" aria-label="Jazyk přepisu">
              <button
                type="button"
                role="tab"
                className={`vx-transcript-panel-toggle-btn${viewMode === "translation" ? " is-active" : ""}`}
                aria-selected={viewMode === "translation"}
                onClick={() => setViewMode("translation")}
              >
                Překlad
              </button>
              <button
                type="button"
                role="tab"
                className={`vx-transcript-panel-toggle-btn${viewMode === "original" ? " is-active" : ""}`}
                aria-selected={viewMode === "original"}
                onClick={() => setViewMode("original")}
              >
                Originál
              </button>
            </div>
          ) : null}
          {showTranscript ? (
            <TranscriptParagraphs text={displayedTranscript} />
          ) : preparing ? (
            <div className="vx-transcript-panel-preparing" aria-live="polite" aria-busy="true">
              <div className="vx-transcript-panel-clock" aria-hidden="true">
                <span className="vx-transcript-panel-clock-face" />
                <span className="vx-transcript-panel-clock-hand" />
              </div>
              <p className="vx-transcript-panel-preparing-title">Připravujeme pro vás</p>
              {preparingHint(softTimedOut) ? (
                <p className="vx-transcript-panel-preparing-hint">{preparingHint(softTimedOut)}</p>
              ) : null}
            </div>
          ) : (
            <>
              <p className="vx-transcript-panel-message" aria-live="polite">
                {message}
              </p>
              {showRetry ? (
                <button type="button" className="vx-transcript-panel-retry" onClick={retry}>
                  Zkusit znovu
                </button>
              ) : null}
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

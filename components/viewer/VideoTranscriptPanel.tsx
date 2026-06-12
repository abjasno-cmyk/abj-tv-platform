"use client";

import { useCallback, useEffect, useState } from "react";

import {
  fetchVideoTranscript,
  TRANSCRIPT_POLL_INTERVAL_MS,
  TRANSCRIPT_POLL_TIMEOUT_MS,
} from "@/lib/transcriptApi";
import type { TranscriptResponse } from "@/lib/transcriptTypes";

type VideoTranscriptPanelProps = {
  open: boolean;
  onClose: () => void;
  videoId: string | null;
  videoTitle?: string;
};

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

function panelMessage(response: TranscriptResponse | null, loading: boolean, pollTimedOut: boolean): string {
  if (loading && !response) return "Načítáme…";
  if (!response) return "Přepis se nepodařilo načíst.";

  switch (response.status) {
    case "ready":
      return response.transcript?.trim() ? "" : "Přepis je prázdný.";
    case "processing":
      return pollTimedOut
        ? "Přepis se stále připravuje. Zkuste to za chvíli znovu."
        : "Připravujeme přepis…";
    case "not_ready_live":
      return "Přepis bude po skončení vysílání.";
    case "unavailable":
      return "Přepis není k dispozici.";
    default:
      return "Přepis není k dispozici.";
  }
}

export function VideoTranscriptPanel({ open, onClose, videoId, videoTitle }: VideoTranscriptPanelProps) {
  const [response, setResponse] = useState<TranscriptResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [pollTimedOut, setPollTimedOut] = useState(false);

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

  useEffect(() => {
    if (!open || !videoId) return;

    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;
    const startedAt = Date.now();

    const load = async () => {
      setLoading(true);
      const data = await fetchVideoTranscript(videoId);
      if (cancelled) return;

      setResponse(data);
      setLoading(false);

      if (!data || data.status === "ready" || data.status === "unavailable" || data.status === "not_ready_live") {
        return;
      }

      if (data.status === "processing") {
        if (Date.now() - startedAt >= TRANSCRIPT_POLL_TIMEOUT_MS) {
          setPollTimedOut(true);
          return;
        }
        pollTimer = setTimeout(() => {
          void load();
        }, TRANSCRIPT_POLL_INTERVAL_MS);
      }
    };

    setResponse(null);
    setPollTimedOut(false);
    void load();

    return () => {
      cancelled = true;
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [open, videoId]);

  if (!open) return null;

  const message = panelMessage(response, loading, pollTimedOut);
  const showTranscript = response?.status === "ready" && Boolean(response.transcript?.trim());

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
          {showTranscript ? (
            <TranscriptParagraphs text={response!.transcript!} />
          ) : (
            <p className="vx-transcript-panel-message" aria-live="polite">
              {message}
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}

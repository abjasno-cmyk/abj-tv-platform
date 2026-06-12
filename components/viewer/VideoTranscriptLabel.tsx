"use client";

import { useState, type MouseEvent } from "react";

import { VideoTranscriptPanel } from "@/components/viewer/VideoTranscriptPanel";
import { isTranscriptLabelVisible, type TranscriptState } from "@/lib/transcriptTypes";

type VideoTranscriptLabelProps = {
  videoId: string;
  videoTitle?: string;
  transcriptState?: TranscriptState | null;
  compact?: boolean;
  className?: string;
};

export function VideoTranscriptLabel({
  videoId,
  videoTitle,
  transcriptState,
  compact = false,
  className,
}: VideoTranscriptLabelProps) {
  const [panelOpen, setPanelOpen] = useState(false);

  if (!isTranscriptLabelVisible(transcriptState)) return null;

  const openPanel = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setPanelOpen(true);
  };

  const classes =
    className ?? `vx-transcript-label${compact ? " vx-transcript-label--compact" : ""}`;

  return (
    <>
      <button
        type="button"
        className={classes}
        onClick={openPanel}
        aria-label="Zobrazit přepis videa"
        title="Přepis videa"
      >
        <span className={compact ? "vx-transcript-label-text vx-transcript-label-text--compact" : "vx-transcript-label-text"}>
          PŘEPIS VIDEA
        </span>
      </button>
      <VideoTranscriptPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        videoId={videoId}
        videoTitle={videoTitle}
      />
    </>
  );
}

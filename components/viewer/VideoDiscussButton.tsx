"use client";

import { useState, type MouseEvent } from "react";

import { VideoCommentsDrawer } from "@/components/auth/VideoCommentsDrawer";

type VideoDiscussButtonProps = {
  videoId: string;
  videoTitle?: string;
  compact?: boolean;
  className?: string;
};

export function VideoDiscussButton({
  videoId,
  videoTitle,
  compact = false,
  className,
}: VideoDiscussButtonProps) {
  const [commentsOpen, setCommentsOpen] = useState(false);

  const openComments = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setCommentsOpen(true);
  };

  const classes =
    className ?? `vx-discuss-video${compact ? " vx-discuss-video--compact" : ""}`;

  return (
    <>
      <button
        type="button"
        className={classes}
        onClick={openComments}
        aria-label="Diskutovat k videu"
        title="Diskutovat"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="vx-discuss-video-icon" src="/design/icons/ikona_komentovat.png" alt="" />
        <span
          className={
            compact ? "vx-discuss-video-label vx-discuss-video-label--compact" : "vx-discuss-video-label"
          }
        >
          Diskutovat
        </span>
      </button>
      <VideoCommentsDrawer
        open={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        videoId={videoId}
        videoTitle={videoTitle}
        defaultView="video"
      />
    </>
  );
}

"use client";

import { useState, type MouseEvent } from "react";

import { VideoCommentsDrawer } from "@/components/auth/VideoCommentsDrawer";

const COMMENT_ICON = "/design/icons/ikona_komentovat.png";

type VideoCommentButtonProps = {
  videoId: string;
  videoTitle?: string;
  variant?: "overlay" | "inline" | "hero";
  defaultView?: "global" | "video";
  className?: string;
};

export function VideoCommentButton({
  videoId,
  videoTitle,
  variant = "overlay",
  defaultView = "video",
  className,
}: VideoCommentButtonProps) {
  const [commentsOpen, setCommentsOpen] = useState(false);

  const openComments = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setCommentsOpen(true);
  };

  const classes = ["vx-video-comment-btn", `vx-video-comment-btn--${variant}`, className ?? null]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <button type="button" className={classes} onClick={openComments} aria-label="Komentovat video" title="Komentovat">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="vx-video-comment-icon" src={COMMENT_ICON} alt="" />
      </button>
      <VideoCommentsDrawer
        open={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        videoId={videoId}
        videoTitle={videoTitle}
        defaultView={defaultView}
      />
    </>
  );
}

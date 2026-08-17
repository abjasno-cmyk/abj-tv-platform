"use client";

import { useEffect, useState, type MouseEvent } from "react";

import { VideoCommentsDrawer } from "@/components/auth/VideoCommentsDrawer";
import { getDictionary } from "@/lib/i18n/dictionary";
import { useLocale } from "@/lib/i18n/useLocale";

type VideoDiscussButtonProps = {
  videoId: string;
  videoTitle?: string;
  compact?: boolean;
  className?: string;
};

const COMMENT_COUNT_CACHE = new Map<string, number>();
const COMMENT_COUNT_INFLIGHT = new Map<string, Promise<number>>();

async function fetchVideoCommentCount(videoId: string): Promise<number> {
  const response = await fetch(
    `/api/viewer/comments/count?entityType=video&entityId=${encodeURIComponent(videoId)}`,
    {
      cache: "no-store",
      credentials: "include",
    },
  );
  if (!response.ok) return 0;
  const payload = (await response.json().catch(() => ({}))) as { count?: unknown };
  const count =
    typeof payload.count === "number"
      ? payload.count
      : typeof payload.count === "string"
        ? Number(payload.count)
        : 0;
  if (!Number.isFinite(count) || count < 0) return 0;
  return Math.floor(count);
}

async function loadVideoCommentCount(videoId: string): Promise<number> {
  const cached = COMMENT_COUNT_CACHE.get(videoId);
  if (cached !== undefined) {
    return cached;
  }

  const pending = COMMENT_COUNT_INFLIGHT.get(videoId);
  if (pending) return pending;

  const request = fetchVideoCommentCount(videoId)
    .then((count) => {
      COMMENT_COUNT_CACHE.set(videoId, count);
      return count;
    })
    .catch(() => 0)
    .finally(() => {
      COMMENT_COUNT_INFLIGHT.delete(videoId);
    });

  COMMENT_COUNT_INFLIGHT.set(videoId, request);
  return request;
}

export function VideoDiscussButton({
  videoId,
  videoTitle,
  compact = false,
  className,
}: VideoDiscussButtonProps) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [resolvedCounts, setResolvedCounts] = useState<Record<string, number>>({});
  const dictionary = getDictionary(useLocale());

  const openComments = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setCommentsOpen(true);
  };

  useEffect(() => {
    let active = true;

    const cached = COMMENT_COUNT_CACHE.get(videoId);
    if (cached !== undefined) {
      return () => {
        active = false;
      };
    }

    void loadVideoCommentCount(videoId).then((count) => {
      if (!active) return;
      setResolvedCounts((prev) => {
        if (prev[videoId] === count) return prev;
        return {
          ...prev,
          [videoId]: count,
        };
      });
    });

    return () => {
      active = false;
    };
  }, [videoId]);

  const classes =
    className ?? `vx-discuss-video${compact ? " vx-discuss-video--compact" : ""}`;
  const commentCount =
    resolvedCounts[videoId] ?? COMMENT_COUNT_CACHE.get(videoId) ?? 0;
  const countLabel = `${dictionary.common.discuss} (${commentCount})`;

  return (
    <>
      <button
        type="button"
        className={classes}
        onClick={openComments}
        aria-label={`${countLabel} k videu`}
        title={countLabel}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="vx-discuss-video-icon" src="/design/icons/ikona_komentovat.png" alt="" />
        <span
          className={
            compact ? "vx-discuss-video-label vx-discuss-video-label--compact" : "vx-discuss-video-label"
          }
        >
          {countLabel}
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

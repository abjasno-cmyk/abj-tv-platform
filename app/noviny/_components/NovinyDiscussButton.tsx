"use client";

import { useEffect, useState, type MouseEvent } from "react";

import { NovinyCommentsDrawer } from "@/app/noviny/_components/NovinyCommentsDrawer";
import { VIEWER_COMMENT_ENTITY_NOVINY_ARTICLE } from "@/lib/viewer/comments";

type NovinyDiscussButtonProps = {
  articleId: string;
  articleTitle?: string;
  compact?: boolean;
  className?: string;
};

const COMMENT_COUNT_CACHE = new Map<string, number>();
const COMMENT_COUNT_INFLIGHT = new Map<string, Promise<number>>();

async function fetchNovinyCommentCount(articleId: string): Promise<number> {
  const response = await fetch(
    `/api/viewer/comments/count?entityType=${encodeURIComponent(VIEWER_COMMENT_ENTITY_NOVINY_ARTICLE)}&entityId=${encodeURIComponent(articleId)}`,
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

async function loadNovinyCommentCount(articleId: string): Promise<number> {
  const cached = COMMENT_COUNT_CACHE.get(articleId);
  if (cached !== undefined) return cached;

  const pending = COMMENT_COUNT_INFLIGHT.get(articleId);
  if (pending) return pending;

  const request = fetchNovinyCommentCount(articleId)
    .then((count) => {
      COMMENT_COUNT_CACHE.set(articleId, count);
      return count;
    })
    .catch(() => 0)
    .finally(() => {
      COMMENT_COUNT_INFLIGHT.delete(articleId);
    });

  COMMENT_COUNT_INFLIGHT.set(articleId, request);
  return request;
}

export function NovinyDiscussButton({
  articleId,
  articleTitle,
  compact = false,
  className,
}: NovinyDiscussButtonProps) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [resolvedCounts, setResolvedCounts] = useState<Record<string, number>>({});

  const openComments = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setCommentsOpen(true);
  };

  useEffect(() => {
    let active = true;

    const cached = COMMENT_COUNT_CACHE.get(articleId);
    if (cached !== undefined) {
      return () => {
        active = false;
      };
    }

    void loadNovinyCommentCount(articleId).then((count) => {
      if (!active) return;
      setResolvedCounts((prev) => {
        if (prev[articleId] === count) return prev;
        return {
          ...prev,
          [articleId]: count,
        };
      });
    });

    return () => {
      active = false;
    };
  }, [articleId]);

  const classes = className ?? `vx-discuss-video${compact ? " vx-discuss-video--compact" : ""}`;
  const commentCount = resolvedCounts[articleId] ?? COMMENT_COUNT_CACHE.get(articleId) ?? 0;
  const countLabel = `Diskutovat (${commentCount})`;

  return (
    <>
      <button
        type="button"
        className={classes}
        onClick={openComments}
        aria-label={`${countLabel} k článku`}
        title={countLabel}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="vx-discuss-video-icon" src="/design/icons/ikona_komentovat.png" alt="" />
        <span className={compact ? "vx-discuss-video-label vx-discuss-video-label--compact" : "vx-discuss-video-label"}>
          {countLabel}
        </span>
      </button>
      <NovinyCommentsDrawer
        open={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        articleId={articleId}
        articleTitle={articleTitle}
      />
    </>
  );
}

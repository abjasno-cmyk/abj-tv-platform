"use client";

import Link from "next/link";
import type { MouseEvent } from "react";

const COMMENTS_SECTION_ID = "komentare";

type OpinionDiscussButtonProps = {
  articleId: string;
  articleTitle?: string;
  slug?: string;
  behavior: "scroll" | "link";
  compact?: boolean;
  className?: string;
};

function DiscussLabel({ compact }: { compact?: boolean }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="vx-discuss-video-icon" src="/design/icons/ikona_komentovat.png" alt="" />
      <span
        className={
          compact ? "vx-discuss-video-label vx-discuss-video-label--compact" : "vx-discuss-video-label"
        }
      >
        Diskutovat
      </span>
    </>
  );
}

export function OpinionDiscussButton({
  articleId,
  articleTitle,
  slug,
  behavior,
  compact = false,
  className,
}: OpinionDiscussButtonProps) {
  const classes =
    className ?? `vx-discuss-video${compact ? " vx-discuss-video--compact" : ""}`;
  const ariaLabel = articleTitle
    ? `Diskutovat k článku ${articleTitle}`
    : "Diskutovat k článku";

  if (behavior === "link") {
    if (!slug) return null;
    return (
      <Link
        href={`/nazory/${slug}#${COMMENTS_SECTION_ID}`}
        className={classes}
        aria-label={ariaLabel}
        title="Diskutovat"
      >
        <DiscussLabel compact={compact} />
      </Link>
    );
  }

  const scrollToComments = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    document.getElementById(COMMENTS_SECTION_ID)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <button
      type="button"
      className={classes}
      onClick={scrollToComments}
      aria-label={ariaLabel}
      title="Diskutovat"
      data-article-id={articleId}
    >
      <DiscussLabel compact={compact} />
    </button>
  );
}

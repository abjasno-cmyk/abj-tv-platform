"use client";

import Link from "next/link";
import type { MouseEvent } from "react";

import { getDictionary } from "@/lib/i18n/dictionary";
import { localizedPath } from "@/lib/i18n/paths";
import { useLocale } from "@/lib/i18n/useLocale";

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
  const dictionary = getDictionary(useLocale());
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="vx-discuss-video-icon" src="/design/icons/ikona_komentovat.png" alt="" />
      <span
        className={
          compact ? "vx-discuss-video-label vx-discuss-video-label--compact" : "vx-discuss-video-label"
        }
      >
        {dictionary.common.discuss}
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
  const locale = useLocale();
  const dictionary = getDictionary(locale);
  const ariaLabel = articleTitle
    ? `${dictionary.common.discuss}: ${articleTitle}`
    : dictionary.common.discuss;

  if (behavior === "link") {
    if (!slug) return null;
    return (
      <Link
        href={`${localizedPath(locale, `/nazory/${slug}`)}#${COMMENTS_SECTION_ID}`}
        className={classes}
        aria-label={ariaLabel}
        title={dictionary.common.discuss}
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
      title={dictionary.common.discuss}
      data-article-id={articleId}
    >
      <DiscussLabel compact={compact} />
    </button>
  );
}

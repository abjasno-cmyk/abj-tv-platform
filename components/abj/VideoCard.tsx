"use client";

import Image from "next/image";
import Link from "next/link";
import { memo } from "react";

type VideoCardProps = {
  videoId: string;
  thumbnail: string | null;
  title: string;
  channel: string;
  publishedAt: string | null;
  featured?: boolean;
};

function formatPublishedLabel(value: string | null): string {
  if (!value) return "čas neuveden";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "čas neuveden";
  return new Intl.DateTimeFormat("cs-CZ", {
    timeZone: "Europe/Prague",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function VideoCardBase({
  videoId,
  thumbnail,
  title,
  channel,
  publishedAt,
  featured = false,
}: VideoCardProps) {
  const href = `/live?videoId=${encodeURIComponent(videoId)}`;
  const publishedLabel = formatPublishedLabel(publishedAt);
  const isHero = featured;
  return (
    <Link
      href={href}
      className="group block overflow-hidden rounded-xl border border-[var(--abj-gold-dim)] bg-abj-panel shadow-[0_4px_18px_rgba(0,0,0,0.35)] transition-all duration-200 hover:scale-[1.03] hover:shadow-[0_12px_28px_rgba(0,0,0,0.55)]"
    >
      <div className="relative aspect-video w-full overflow-hidden bg-abj-card">
        <Image
          src={thumbnail ?? "/placeholder-thumb.jpg"}
          alt={title}
          fill
          sizes={isHero ? "(max-width: 768px) 100vw, 50vw" : "(max-width: 768px) 100vw, 33vw"}
          className="object-cover transition-transform duration-200 group-hover:scale-[1.03]"
          loading="lazy"
          unoptimized={Boolean(thumbnail)}
        />
        {isHero ? (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-3 pb-3 pt-8">
            <p className="line-clamp-2 font-[var(--font-serif)] text-[16px] leading-tight text-abj-text1">{title}</p>
            <p className="mt-1 text-xs text-abj-text2">{channel}</p>
          </div>
        ) : null}
      </div>
      {!isHero ? (
        <div className="space-y-1 px-3 py-3">
          <p className="line-clamp-2 text-sm font-medium text-abj-text1">{title}</p>
          <p className="text-xs text-abj-text2">{channel}</p>
          <p className="text-[11px] text-abj-text3">{publishedLabel}</p>
        </div>
      ) : null}
    </Link>
  );
}

export const VideoCard = memo(VideoCardBase);

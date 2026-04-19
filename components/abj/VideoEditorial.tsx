"use client";

import { memo } from "react";

import type { FeedVideoFreshness } from "@/lib/dayOverview";

type VideoEditorialProps = {
  tldr?: string;
  context?: string;
  impact?: string;
  freshness: FeedVideoFreshness;
};

const FRESHNESS_BORDER_CLASS: Record<FeedVideoFreshness, string> = {
  breaking: "border-l-[#B84A4A]",
  today: "border-l-[var(--abj-gold)]",
  week: "border-l-[#4F79B8]",
  evergreen: "border-l-[#5A9E74]",
};

function clampText(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
}

function VideoEditorialBase({ tldr, context, impact, freshness }: VideoEditorialProps) {
  if (!tldr?.trim()) return null;

  const safeTldr = clampText(tldr, "");
  const safeContext = clampText(context, "");
  const safeImpact = clampText(impact, "");

  return (
    <div
      className={`mt-2 border-l-2 ${FRESHNESS_BORDER_CLASS[freshness]} bg-[rgba(6,14,24,0.65)] px-2.5 py-2`}
    >
      <div className="line-clamp-3 space-y-1 text-[11px] leading-[1.35]">
        <p className="font-medium text-abj-text1">{safeTldr}</p>
        {safeContext ? <p className="text-abj-text2">{safeContext}</p> : null}
        {safeImpact ? <p className="font-semibold text-abj-gold">{safeImpact}</p> : null}
      </div>
    </div>
  );
}

export const VideoEditorial = memo(VideoEditorialBase);

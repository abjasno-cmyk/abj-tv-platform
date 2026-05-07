"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";

import type { FeedVideoFreshness } from "@/lib/dayOverview";

type VideoEditorialProps = {
  videoId: string;
  tldr?: string;
  context?: string;
  impact?: string;
  freshness: FeedVideoFreshness;
};

const FRESHNESS_BORDER_CLASS: Record<FeedVideoFreshness, string> = {
  breaking: "border-l-[#FF6A00]",
  today: "border-l-[var(--abj-gold)]",
  week: "border-l-[#4F79B8]",
  evergreen: "border-l-[#5A9E74]",
};

function clampText(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
}

async function trackEditorialEvent(videoId: string, eventType: "expand" | "play" | "skip") {
  try {
    await fetch("/editorial/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        video_id: videoId,
        event_type: eventType,
      }),
      keepalive: true,
    });
  } catch {
    // Silent tracking failures by design.
  }
}

function VideoEditorialBase({ videoId, tldr, context, impact, freshness }: VideoEditorialProps) {
  const safeTldr = clampText(tldr, "");
  const safeContext = clampText(context, "");
  const safeImpact = clampText(impact, "");
  const [isExpanded, setIsExpanded] = useState(false);
  const [skipSent, setSkipSent] = useState(false);
  const [playSent, setPlaySent] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const hasTldr = safeTldr.length > 0;
  const hasContext = safeContext.length > 0;

  const contextPreview = useMemo(() => {
    if (!hasContext) return "";
    const firstLine = safeContext.split(/\r?\n/).find((line) => line.trim().length > 0);
    return (firstLine ?? safeContext).trim();
  }, [hasContext, safeContext]);

  useEffect(() => {
    if (!hasTldr) return;
    if (!videoId || playSent) return;
    const onClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const link = event.target.closest("a");
      if (!link) return;
      if (!link.getAttribute("href")?.includes(`videoId=${encodeURIComponent(videoId)}`)) return;
      setPlaySent(true);
      void trackEditorialEvent(videoId, "play");
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [hasTldr, playSent, videoId]);

  useEffect(() => {
    if (!hasTldr) return;
    if (!videoId || skipSent) return;
    const timer = window.setTimeout(() => {
      const root = rootRef.current;
      if (!root) return;
      const rect = root.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      const offscreen = rect.bottom < 0 || rect.top > vh;
      if (offscreen) {
        setSkipSent(true);
        void trackEditorialEvent(videoId, "skip");
      }
    }, 3_000);
    return () => window.clearTimeout(timer);
  }, [hasTldr, skipSent, videoId]);

  if (!hasTldr) return null;

  return (
    <div
      ref={rootRef}
      className={`mt-2 border-l-2 ${FRESHNESS_BORDER_CLASS[freshness]} bg-[rgba(6,14,24,0.65)] px-2.5 py-2`}
    >
      <div className="line-clamp-3 space-y-1 text-[11px] leading-[1.35]">
        <p className="font-medium text-abj-text1">{safeTldr}</p>
        {hasContext ? (
          <>
            <p className="text-abj-text2">{isExpanded ? safeContext : contextPreview}</p>
            {!isExpanded ? (
              <button
                type="button"
                className="text-[10px] uppercase tracking-[0.08em] text-abj-text2 hover:text-abj-text1"
                onClick={() => {
                  setIsExpanded(true);
                  void trackEditorialEvent(videoId, "expand");
                }}
              >
                Zobrazit více
              </button>
            ) : null}
          </>
        ) : null}
        {safeImpact ? <p className="font-semibold text-abj-gold">{safeImpact}</p> : null}
      </div>
    </div>
  );
}

export const VideoEditorial = memo(VideoEditorialBase);

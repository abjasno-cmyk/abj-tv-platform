"use client";

import { useCallback, useMemo, useState } from "react";

import { videoShareUrl } from "@/lib/viewer/videoMetadata";

type ShareVideoButtonProps = {
  videoId: string;
  className?: string;
  label?: string;
};

export function ShareVideoButton({
  videoId,
  className = "vx-share-video",
  label = "Sdílet",
}: ShareVideoButtonProps) {
  const [copied, setCopied] = useState(false);
  const shareUrl = useMemo(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return videoShareUrl(videoId, origin);
  }, [videoId]);

  const handleShare = useCallback(async () => {
    const url =
      typeof window !== "undefined"
        ? videoShareUrl(videoId, window.location.origin)
        : shareUrl;
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ url, title: "VEROX" });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      } catch {
        setCopied(false);
      }
    }
  }, [shareUrl, videoId]);

  return (
    <button type="button" className={className} onClick={() => void handleShare()}>
      {copied ? "Odkaz zkopírován" : label}
    </button>
  );
}

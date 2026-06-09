"use client";

import { useEffect, useState } from "react";

import { ShareMenu } from "@/components/nazory/ShareMenu";
import { videoShareUrl } from "@/lib/viewer/videoMetadata";

type ShareVideoButtonProps = {
  videoId: string;
  title?: string;
};

export function ShareVideoButton({ videoId, title }: ShareVideoButtonProps) {
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  useEffect(() => {
    setShareUrl(videoShareUrl(videoId, window.location.origin));
  }, [videoId]);

  if (!shareUrl) return null;

  return <ShareMenu url={shareUrl} title={title} />;
}

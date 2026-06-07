"use client";

import { useEffect, useState } from "react";

import { CopyLinkButton } from "@/components/nazory/CopyLinkButton";
import { videoShareUrl } from "@/lib/viewer/videoMetadata";

type ShareVideoButtonProps = {
  videoId: string;
};

export function ShareVideoButton({ videoId }: ShareVideoButtonProps) {
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  useEffect(() => {
    setShareUrl(videoShareUrl(videoId, window.location.origin));
  }, [videoId]);

  if (!shareUrl) return null;

  return <CopyLinkButton url={shareUrl} />;
}

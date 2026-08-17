"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { getDictionary } from "@/lib/i18n/dictionary";
import { useLocale } from "@/lib/i18n/useLocale";
import { resolveVideoThumbnail } from "@/lib/viewer/videoMetadata";

type SaveVideoButtonProps = {
  videoId: string;
  title: string;
  thumbnailUrl?: string | null;
  channelName?: string | null;
  saved?: boolean;
  onSavedChange?: (saved: boolean) => void;
  className?: string;
  compact?: boolean;
};

export function SaveVideoButton({
  videoId,
  title,
  thumbnailUrl,
  channelName,
  saved = false,
  onSavedChange,
  className,
  compact = false,
}: SaveVideoButtonProps) {
  const { isAuthenticated, requestAuth } = useAuth();
  const dictionary = getDictionary(useLocale());
  const [isSaved, setIsSaved] = useState(saved);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsSaved(saved);
  }, [saved]);

  const toggleSave = async () => {
    setLoading(true);
    setError(null);
    const method = isSaved ? "DELETE" : "POST";
    const url =
      method === "DELETE"
        ? `/api/viewer/saved-videos?videoId=${encodeURIComponent(videoId)}`
        : "/api/viewer/saved-videos";
    const response = await fetch(url, {
      method,
      headers: method === "POST" ? { "Content-Type": "application/json" } : undefined,
      body:
        method === "POST"
          ? JSON.stringify({
              videoId,
              title,
              thumbnailUrl: resolveVideoThumbnail(videoId, thumbnailUrl),
              channelName,
            })
          : undefined,
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    setLoading(false);
    if (!response.ok) {
      setError(payload.error ?? "Uložení se nepodařilo. Zkuste obnovit stránku nebo se přihlásit znovu.");
      return;
    }
    const nextSaved = !isSaved;
    setIsSaved(nextSaved);
    onSavedChange?.(nextSaved);
  };

  return (
    <span className="vx-save-video-wrap">
    <button
      type="button"
      className={
        className ??
        `vx-save-video${isSaved ? " is-saved" : ""}${compact ? " vx-save-video--compact" : ""}`
      }
      disabled={loading}
      aria-pressed={isSaved}
      aria-label={isSaved ? dictionary.common.videoSaved : dictionary.common.saveVideo}
      title={isSaved ? dictionary.common.videoSaved : dictionary.common.saveVideo}
      onClick={(event) => {
        event.stopPropagation();
        event.preventDefault();
        if (!isAuthenticated) {
          requestAuth(() => {
            void toggleSave();
          }, { reason: dictionary.header.authReason.default });
          return;
        }
        void toggleSave();
      }}
    >
      <span aria-hidden="true">{isSaved ? "★" : "☆"}</span>
      <span className={compact ? "vx-save-video-label vx-save-video-label--compact" : "vx-save-video-label"}>
        {loading ? "…" : isSaved ? dictionary.common.videoSaved : dictionary.common.saveVideo}
      </span>
    </button>
    {error ? <span className="vx-save-video-error">{error}</span> : null}
    </span>
  );
}

"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
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
  const [isSaved, setIsSaved] = useState(saved);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setIsSaved(saved);
  }, [saved]);

  const toggleSave = async () => {
    setLoading(true);
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
    setLoading(false);
    if (!response.ok) return;
    const nextSaved = !isSaved;
    setIsSaved(nextSaved);
    onSavedChange?.(nextSaved);
  };

  return (
    <button
      type="button"
      className={
        className ??
        `vx-save-video${isSaved ? " is-saved" : ""}${compact ? " vx-save-video--compact" : ""}`
      }
      disabled={loading}
      aria-pressed={isSaved}
      aria-label={isSaved ? "Odebrat z uložených" : "Uložit na později"}
      title={isSaved ? "Odebrat z uložených" : "Uložit na později"}
      onClick={(event) => {
        event.stopPropagation();
        event.preventDefault();
        if (!isAuthenticated) {
          requestAuth(
            () => {
              // Po přihlášení uživatel uložení potvrdí znovu.
            },
            { reason: "Přihlaste se zdarma a uložte si video na později." },
          );
          return;
        }
        void toggleSave();
      }}
    >
      <span aria-hidden="true">{isSaved ? "★" : "☆"}</span>
      {!compact ? <span>{loading ? "…" : isSaved ? "Uloženo" : "Uložit"}</span> : null}
    </button>
  );
}

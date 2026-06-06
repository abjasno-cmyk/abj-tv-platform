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
      aria-label={isSaved ? "Odebrat video z uložených" : "Uložit video na později"}
      title={isSaved ? "Odebrat video z uložených" : "Uložit video na později"}
      onClick={(event) => {
        event.stopPropagation();
        event.preventDefault();
        if (!isAuthenticated) {
          requestAuth(() => {
            void toggleSave();
          }, { reason: "Přihlaste se zdarma a uložte si video na později." });
          return;
        }
        void toggleSave();
      }}
    >
      <span aria-hidden="true">{isSaved ? "★" : "☆"}</span>
      <span className={compact ? "vx-save-video-label vx-save-video-label--compact" : "vx-save-video-label"}>
        {loading ? "…" : isSaved ? "Video uloženo" : "Uložit video"}
      </span>
    </button>
    {error ? <span className="vx-save-video-error">{error}</span> : null}
    </span>
  );
}

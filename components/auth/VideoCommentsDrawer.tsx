"use client";

import { useCallback, useEffect } from "react";

import { CommentsSection } from "@/components/auth/CommentsSection";

type VideoCommentsDrawerProps = {
  open: boolean;
  onClose: () => void;
  videoId: string | null;
  videoTitle?: string;
};

export function VideoCommentsDrawer({ open, onClose, videoId, videoTitle }: VideoCommentsDrawerProps) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [handleKeyDown, open]);

  if (!open) return null;

  return (
    <div className="vx-comments-drawer" role="presentation">
      <button type="button" className="vx-comments-drawer-backdrop" aria-label="Zavřít diskusi" onClick={onClose} />
      <aside className="vx-comments-drawer-panel" role="dialog" aria-modal="true" aria-labelledby="vx-comments-drawer-title">
        <header className="vx-comments-drawer-head">
          <h2 id="vx-comments-drawer-title">Komentáře</h2>
          <button type="button" className="vx-comments-drawer-close" onClick={onClose} aria-label="Zavřít">
            ×
          </button>
        </header>
        <div className="vx-comments-drawer-body">
          <CommentsSection
            scope="global"
            entityId={videoId}
            videoTitle={videoTitle}
            heading="Diskuse VEROX"
            compact
          />
        </div>
      </aside>
    </div>
  );
}

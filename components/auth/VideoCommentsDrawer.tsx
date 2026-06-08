"use client";

import { useCallback, useEffect, useState } from "react";

import { CommentsSection } from "@/components/auth/CommentsSection";

type VideoCommentsDrawerProps = {
  open: boolean;
  onClose: () => void;
  videoId: string | null;
  videoTitle?: string;
  defaultView?: DrawerView;
};

type DrawerView = "global" | "video";

export function VideoCommentsDrawer({
  open,
  onClose,
  videoId,
  videoTitle,
  defaultView = "global",
}: VideoCommentsDrawerProps) {
  const [view, setView] = useState<DrawerView>("global");

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

  useEffect(() => {
    if (open) setView(defaultView);
  }, [defaultView, open]);

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
        <div className="vx-comments-drawer-tabs" role="tablist" aria-label="Rozsah komentářů">
          <button
            type="button"
            role="tab"
            aria-selected={view === "global"}
            className={view === "global" ? "is-active" : undefined}
            onClick={() => setView("global")}
          >
            Všechny
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === "video"}
            className={view === "video" ? "is-active" : undefined}
            onClick={() => setView("video")}
            disabled={!videoId}
          >
            Toto video
          </button>
        </div>
        <div className="vx-comments-drawer-body">
          <CommentsSection
            key={view}
            scope={view === "global" ? "global" : "entity"}
            entityId={videoId}
            videoTitle={videoTitle}
            heading={view === "global" ? "Diskuse VEROX" : "Komentáře k videu"}
            compact
          />
        </div>
      </aside>
    </div>
  );
}

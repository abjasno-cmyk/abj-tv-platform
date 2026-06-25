"use client";

import { useCallback, useEffect } from "react";

import { CommentsSection } from "@/components/auth/CommentsSection";
import { VIEWER_COMMENT_ENTITY_NOVINY_ARTICLE } from "@/lib/viewer/comments";

type NovinyCommentsDrawerProps = {
  open: boolean;
  onClose: () => void;
  articleId: string;
  articleTitle?: string;
};

export function NovinyCommentsDrawer({ open, onClose, articleId, articleTitle }: NovinyCommentsDrawerProps) {
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
      <aside className="vx-comments-drawer-panel" role="dialog" aria-modal="true" aria-labelledby="noviny-comments-drawer-title">
        <header className="vx-comments-drawer-head">
          <h2 id="noviny-comments-drawer-title">Komentáře k článku</h2>
          <button type="button" className="vx-comments-drawer-close" onClick={onClose} aria-label="Zavřít">
            ×
          </button>
        </header>
        <div className="vx-comments-drawer-body">
          <CommentsSection
            key={articleId}
            scope="entity"
            entityType={VIEWER_COMMENT_ENTITY_NOVINY_ARTICLE}
            entityId={articleId}
            videoTitle={articleTitle}
            heading="Komentáře k článku"
            compact
          />
        </div>
      </aside>
    </div>
  );
}

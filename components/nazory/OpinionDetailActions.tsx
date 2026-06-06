"use client";

import { useEffect, useState } from "react";

import { CopyLinkButton } from "@/components/nazory/CopyLinkButton";
import { OpinionLikeButton } from "@/components/nazory/OpinionLikeButton";
import { SaveOpinionButton } from "@/components/nazory/SaveOpinionButton";
import { useAuth } from "@/components/auth/AuthProvider";

type OpinionDetailActionsProps = {
  articleId: string;
  title: string;
  slug: string;
  heroImagePath?: string | null;
  authorName: string;
  shareUrl: string;
  editHref?: string | null;
};

export function OpinionDetailActions({
  articleId,
  title,
  slug,
  heroImagePath,
  authorName,
  shareUrl,
  editHref = null,
}: OpinionDetailActionsProps) {
  const { isAuthenticated } = useAuth();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setSaved(false);
      return;
    }
    let cancelled = false;
    void fetch("/api/viewer/saved-opinions", { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json()) as { articles?: Array<{ articleId: string }> };
        if (!cancelled && response.ok) {
          setSaved((payload.articles ?? []).some((row) => row.articleId === articleId));
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [articleId, isAuthenticated]);

  return (
    <div className="nazory-detail-actions">
      <OpinionLikeButton articleId={articleId} />
      <SaveOpinionButton
        articleId={articleId}
        title={title}
        slug={slug}
        heroImagePath={heroImagePath}
        authorName={authorName}
        saved={saved}
        onSavedChange={setSaved}
      />
      <CopyLinkButton url={shareUrl} />
      {editHref ? (
        <a className="nazory-btn" href={editHref}>
          Upravit článek
        </a>
      ) : null}
    </div>
  );
}

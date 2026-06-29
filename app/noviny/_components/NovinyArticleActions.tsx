"use client";

import { LikeButton } from "@/components/auth/LikeButton";
import { ShareMenu } from "@/components/nazory/ShareMenu";
import { NovinyDiscussButton } from "@/app/noviny/_components/NovinyDiscussButton";
import { SaveNovinyArticleButton } from "@/app/noviny/_components/SaveNovinyArticleButton";
import { VIEWER_ENTITY_NOVINY_ARTICLE } from "@/lib/viewer/entities";

type NovinyArticleActionsProps = {
  articleId: string;
  title: string;
  sourceName?: string | null;
  originalUrl: string;
  imageUrl?: string | null;
  publishedAt?: string | null;
  shareUrl: string;
  compact?: boolean;
};

export function NovinyArticleActions({
  articleId,
  title,
  sourceName,
  originalUrl,
  imageUrl,
  publishedAt,
  shareUrl,
  compact = false,
}: NovinyArticleActionsProps) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <LikeButton
        entityType={VIEWER_ENTITY_NOVINY_ARTICLE}
        entityId={articleId}
        className={`nazory-btn nazory-btn-like${compact ? " vx-save-video--compact" : ""}`}
      />
      <SaveNovinyArticleButton
        articleId={articleId}
        title={title}
        sourceName={sourceName}
        originalUrl={originalUrl}
        imageUrl={imageUrl}
        publishedAt={publishedAt}
        compact={compact}
        className={`vx-save-video${compact ? " vx-save-video--compact" : ""}`}
      />
      <ShareMenu url={shareUrl} title={title} />
      <NovinyDiscussButton articleId={articleId} articleTitle={title} compact={compact} />
    </div>
  );
}

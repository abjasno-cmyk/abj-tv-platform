"use client";

import { CommentsSection } from "@/components/auth/CommentsSection";
import { VIEWER_COMMENT_ENTITY_OPINION } from "@/lib/viewer/comments";

export function CommentsBlock({
  articleId,
  articleTitle,
  articleSlug,
}: {
  articleId: string;
  articleTitle?: string;
  articleSlug?: string;
}) {
  return (
    <section id="komentare" className="nazory-comments">
      <CommentsSection
        entityType={VIEWER_COMMENT_ENTITY_OPINION}
        entityId={articleId}
        heading="Komentáře"
        videoTitle={articleTitle}
        opinionSlug={articleSlug ?? null}
      />
    </section>
  );
}

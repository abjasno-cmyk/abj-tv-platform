"use client";

import { CommentsSection } from "@/components/auth/CommentsSection";
import { VIEWER_COMMENT_ENTITY_OPINION } from "@/lib/viewer/comments";

export function CommentsBlock({ articleId }: { articleId: string; articleTitle?: string }) {
  return (
    <section className="nazory-comments">
      <CommentsSection entityType={VIEWER_COMMENT_ENTITY_OPINION} entityId={articleId} heading="Komentáře" />
    </section>
  );
}

import { VIEWER_COMMENT_ENTITY_OPINION, VIEWER_COMMENT_ENTITY_VIDEO } from "@/lib/viewer/comments";
import { videoSharePath } from "@/lib/viewer/videoMetadata";

export function buildCommentEngagementHref(
  entityType: string,
  entityId: string,
  opinionSlug?: string | null,
): string {
  if (entityType === VIEWER_COMMENT_ENTITY_OPINION) {
    return opinionSlug ? `/nazory/${opinionSlug}#komentare` : "/nazory";
  }
  if (entityType === VIEWER_COMMENT_ENTITY_VIDEO) {
    return `${videoSharePath(entityId)}#komentare`;
  }
  return "/muj-verox";
}

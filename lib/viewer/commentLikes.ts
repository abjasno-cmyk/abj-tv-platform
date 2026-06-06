import "server-only";

import { VIEWER_COMMENT_LIKE_ENTITY } from "@/lib/viewer/comments";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export { VIEWER_COMMENT_LIKE_ENTITY };

export type CommentLikeStat = {
  likeCount: number;
  likedByMe: boolean;
};

export async function loadCommentLikeStats(
  commentIds: string[],
  viewerUserId?: string | null,
): Promise<Map<string, CommentLikeStat>> {
  const stats = new Map<string, CommentLikeStat>();
  if (commentIds.length === 0) return stats;

  for (const id of commentIds) {
    stats.set(id, { likeCount: 0, likedByMe: false });
  }

  try {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from("likes")
      .select("entity_id, user_id")
      .eq("entity_type", VIEWER_COMMENT_LIKE_ENTITY)
      .in("entity_id", commentIds);

    if (error || !data) return stats;

    for (const row of data) {
      const commentId = typeof row.entity_id === "string" ? row.entity_id : "";
      if (!commentId || !stats.has(commentId)) continue;
      const current = stats.get(commentId)!;
      current.likeCount += 1;
      if (viewerUserId && row.user_id === viewerUserId) {
        current.likedByMe = true;
      }
    }
  } catch {
    // Likes are optional — comments still render without counts.
  }

  return stats;
}

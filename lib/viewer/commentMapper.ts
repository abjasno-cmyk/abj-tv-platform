import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { isStaffCommentAuthor } from "@/lib/viewer/commentsStaff";
import type { CommentLikeStat } from "@/lib/viewer/commentLikes";
import type { ViewerCommentRecord } from "@/lib/viewer/comments";
import { loadCommentAuthorProfiles } from "@/lib/viewer/profileLookup";

type CommentRow = {
  id: string;
  user_id: string;
  entity_type: string;
  entity_id: string;
  parent_id: string | null;
  body: string;
  status: string;
  is_pinned?: boolean | null;
  created_at: string;
  updated_at: string;
};

export async function mapCommentRows(
  supabase: SupabaseClient,
  rows: CommentRow[],
  options: {
    viewerCanModerate: boolean;
    likeStats?: Map<string, CommentLikeStat>;
  },
): Promise<ViewerCommentRecord[]> {
  const userIds = Array.from(new Set(rows.map((row) => row.user_id).filter((value) => typeof value === "string")));
  const profileById = await loadCommentAuthorProfiles(supabase, userIds);

  return rows.map((row) => {
    const profile = profileById.get(row.user_id) ?? null;
    return {
      id: row.id,
      userId: row.user_id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      parentId: row.parent_id,
      body: row.body,
      status: row.status,
      isPinned: Boolean(row.is_pinned),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      authorName: profile?.display_name ?? "Divák VEROX",
      authorAvatarUrl: profile?.avatar_url ?? null,
      isStaffHighlight: isStaffCommentAuthor(profile),
      canModerate: options.viewerCanModerate,
      likeCount: options.likeStats?.get(row.id)?.likeCount ?? 0,
      likedByMe: options.likeStats?.get(row.id)?.likedByMe ?? false,
    };
  });
}

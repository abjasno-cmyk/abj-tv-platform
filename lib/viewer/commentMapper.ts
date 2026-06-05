import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { isStaffCommentAuthor } from "@/lib/viewer/commentsStaff";
import type { ViewerCommentRecord } from "@/lib/viewer/comments";

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

type ProfileLookup = {
  display_name: string | null;
  avatar_url: string | null;
  email: string | null;
  role: string | null;
};

export async function mapCommentRows(
  supabase: SupabaseClient,
  rows: CommentRow[],
  options: { viewerCanModerate: boolean },
): Promise<ViewerCommentRecord[]> {
  const userIds = Array.from(new Set(rows.map((row) => row.user_id).filter((value) => typeof value === "string")));
  const profileById = new Map<string, ProfileLookup>();

  if (userIds.length > 0) {
    const profilesLookup = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url, email, role")
      .in("id", userIds);
    if (!profilesLookup.error) {
      for (const profile of profilesLookup.data ?? []) {
        profileById.set(profile.id, {
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
          email: profile.email,
          role: profile.role,
        });
      }
    }
  }

  return rows.map((row) => {
    const profile = profileById.get(row.user_id);
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
    };
  });
}

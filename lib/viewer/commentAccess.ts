import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";

import { STUDIO_ALLOWED_EMAILS } from "@/lib/studio/access";
import { isStaffCommentAuthor } from "@/lib/viewer/commentsStaff";

export { isStaffCommentAuthor };

type ProfileRow = {
  email: string | null;
  role: string | null;
};

function normalizeEmail(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

const MODERATOR_PROFILE_ROLES = new Set(["moderator", "admin", "owner"]);

export async function canModerateViewerComments(supabase: SupabaseClient, user: User): Promise<boolean> {
  const email = normalizeEmail(user.email ?? null);
  if (email && STUDIO_ALLOWED_EMAILS.has(email)) return true;

  const profileQuery = await supabase.from("profiles").select("email, role").eq("id", user.id).maybeSingle();
  if (profileQuery.error || !profileQuery.data) return false;

  const profile = profileQuery.data;
  if (isStaffCommentAuthor(profile, email)) return true;
  return MODERATOR_PROFILE_ROLES.has(profile.role?.trim().toLowerCase() ?? "");
}

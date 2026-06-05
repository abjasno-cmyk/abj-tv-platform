import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseServiceClient } from "@/lib/supabase/server";

export type CommentAuthorProfile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  email: string | null;
  role: string | null;
};

export async function loadCommentAuthorProfiles(
  fallbackClient: SupabaseClient,
  userIds: string[],
): Promise<Map<string, CommentAuthorProfile>> {
  const profileById = new Map<string, CommentAuthorProfile>();
  if (userIds.length === 0) return profileById;

  let client: SupabaseClient = fallbackClient;
  try {
    client = createSupabaseServiceClient();
  } catch {
    // Preview/local without service role: fall back to user-scoped client (own profile only).
  }

  const profilesLookup = await client
    .from("profiles")
    .select("id, display_name, avatar_url, email, role")
    .in("id", userIds);

  if (!profilesLookup.error) {
    for (const profile of profilesLookup.data ?? []) {
      profileById.set(profile.id, profile as CommentAuthorProfile);
    }
  }

  return profileById;
}

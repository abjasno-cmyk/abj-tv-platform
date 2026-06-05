import "server-only";

import { PRESENCE_TTL_SECONDS } from "@/lib/live/audience";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export async function upsertSitePresence(sessionId: string, pagePath: string | null): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const now = new Date().toISOString();
  const { error } = await supabase.from("site_presence").upsert(
    {
      session_id: sessionId,
      last_seen_at: now,
      page_path: pagePath,
    },
    { onConflict: "session_id" },
  );
  if (error) {
    throw error;
  }
}

export async function countActiveSitePresence(): Promise<number> {
  const supabase = createSupabaseServiceClient();
  const since = new Date(Date.now() - PRESENCE_TTL_SECONDS * 1000).toISOString();
  const { count, error } = await supabase
    .from("site_presence")
    .select("session_id", { count: "exact", head: true })
    .gte("last_seen_at", since);
  if (error) {
    throw error;
  }
  return count ?? 0;
}

export async function pruneStaleSitePresence(): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const staleBefore = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  await supabase.from("site_presence").delete().lt("last_seen_at", staleBefore);
}

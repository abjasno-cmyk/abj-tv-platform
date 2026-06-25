import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";

import { AuthApiError } from "@/lib/supabase/authenticated-server";
import { isNazoryAdmin } from "@/lib/nazory/access";

/**
 * Noviny MVP používají stejný ověřený admin model jako Názory, aby nebyla
 * rozšiřována riziková secret-based administrace.
 */
export async function requireNovinyAdmin(supabase: SupabaseClient, user: User): Promise<void> {
  const allowed = await isNazoryAdmin(supabase, user);
  if (!allowed) {
    throw new AuthApiError(403, "Nemáte oprávnění spravovat sekci Noviny.");
  }
}

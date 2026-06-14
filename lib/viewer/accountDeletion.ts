import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseServiceClient } from "@/lib/supabase/server";

const CONTACT_EMAIL = "lipovska.hana@seznam.cz";

const STAFF_ROLES = new Set(["admin", "moderator", "owner", "editor", "senior_editor", "analyst"]);

export const ACCOUNT_DELETE_CONFIRMATION = "SMAZAT";

export type AccountDeletionAssessment = {
  allowed: boolean;
  reason: string | null;
  contactEmail: string | null;
};

export function isStaffProfileRole(role: string | null | undefined): boolean {
  const normalized = role?.trim().toLowerCase() ?? "";
  return STAFF_ROLES.has(normalized);
}

export async function assessAccountDeletion(
  supabase: SupabaseClient,
  userId: string,
): Promise<AccountDeletionAssessment> {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    return {
      allowed: false,
      reason: "Účet se teď nepodařilo ověřit. Zkuste to prosím znovu.",
      contactEmail: CONTACT_EMAIL,
    };
  }

  const role = (profile?.role as string | null) ?? "viewer";
  if (isStaffProfileRole(role)) {
    return {
      allowed: false,
      reason: "Účty redakce a moderace nelze smazat samoobslužně. Napište nám prosím e-mail.",
      contactEmail: CONTACT_EMAIL,
    };
  }

  const { count: publishedCount, error: articlesError } = await supabase
    .from("opinion_articles")
    .select("id", { count: "exact", head: true })
    .eq("author_id", userId)
    .eq("status", "published")
    .is("deleted_at", null);

  if (articlesError && !/relation .*opinion_articles.* does not exist/i.test(articlesError.message)) {
    return {
      allowed: false,
      reason: "Účet se teď nepodařilo ověřit. Zkuste to prosím znovu.",
      contactEmail: CONTACT_EMAIL,
    };
  }

  if ((publishedCount ?? 0) > 0) {
    return {
      allowed: false,
      reason:
        "Máte publikované články v Názorech. Jejich smazání vyřešíme individuálně — napište nám prosím e-mail.",
      contactEmail: CONTACT_EMAIL,
    };
  }

  return { allowed: true, reason: null, contactEmail: null };
}

export async function deleteViewerAccount(userId: string): Promise<void> {
  const service = createSupabaseServiceClient();
  const assessment = await assessAccountDeletion(service, userId);
  if (!assessment.allowed) {
    throw new Error(assessment.reason ?? "Účet nelze smazat samoobslužně.");
  }

  const { error } = await service.auth.admin.deleteUser(userId);
  if (error) {
    throw new Error(error.message || "Účet se nepodařilo smazat.");
  }
}

export function getAccountDeletionContactEmail(): string {
  return CONTACT_EMAIL;
}

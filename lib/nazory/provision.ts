import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { findUserIdByEmail } from "@/lib/nazory/authors";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

async function ensureProfileRow(
  supabase: SupabaseClient,
  userId: string,
  email: string,
): Promise<void> {
  const nowIso = new Date().toISOString();
  const { error } = await supabase.from("profiles").upsert(
    {
      id: userId,
      email,
      updated_at: nowIso,
      last_seen_at: nowIso,
    },
    { onConflict: "id" },
  );

  if (error) {
    throw new Error(error.message);
  }
}

async function findAuthUserIdByEmail(supabase: SupabaseClient, email: string): Promise<string | null> {
  let page = 1;
  const perPage = 200;

  while (page <= 10) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw new Error(error.message);
    }

    const match = data.users.find((user) => user.email?.trim().toLowerCase() === email);
    if (match?.id) {
      return match.id;
    }

    if (data.users.length < perPage) {
      break;
    }
    page += 1;
  }

  return null;
}

/**
 * Ensures a profiles row exists for the given Gmail address so an admin can
 * pre-create an author account before the person's first Google login.
 */
export async function provisionUserByEmail(email: string): Promise<string> {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !normalized.includes("@")) {
    throw new Error("Zadejte platný e-mail.");
  }

  const service = createSupabaseServiceClient();

  const existingProfileId = await findUserIdByEmail(service, normalized);
  if (existingProfileId) {
    return existingProfileId;
  }

  const { data: created, error: createError } = await service.auth.admin.createUser({
    email: normalized,
    email_confirm: true,
    user_metadata: { provisioned_by_nazory_admin: true },
  });

  if (created?.user?.id) {
    await ensureProfileRow(service, created.user.id, normalized);
    return created.user.id;
  }

  if (createError) {
    const authUserId = await findAuthUserIdByEmail(service, normalized);
    if (authUserId) {
      await ensureProfileRow(service, authUserId, normalized);
      return authUserId;
    }
    throw new Error(createError.message);
  }

  throw new Error("Uživatele se nepodařilo připravit.");
}

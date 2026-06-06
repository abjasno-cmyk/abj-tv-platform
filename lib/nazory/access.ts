import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";

import { AuthApiError } from "@/lib/supabase/authenticated-server";
import type { AuthorProfileRow } from "@/lib/nazory/types";

export const NAZORY_ADMIN_EMAILS = new Set(["abjasno@gmail.com"]);

const NAZORY_ADMIN_ROLES = new Set(["admin", "owner", "moderator"]);

type ProfileRoleRow = {
  role: string | null;
  email: string | null;
};

export function normalizeEmail(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

export function isNazoryAdminEmail(email: string | null | undefined): boolean {
  const normalized = normalizeEmail(email);
  return normalized ? NAZORY_ADMIN_EMAILS.has(normalized) : false;
}

export function isAuthorRole(role: string | null | undefined): boolean {
  return role?.trim().toLowerCase() === "author";
}

export function isNazoryAdminRole(role: string | null | undefined): boolean {
  const normalized = role?.trim().toLowerCase() ?? "";
  return NAZORY_ADMIN_ROLES.has(normalized);
}

export function isNazoryAdminProfile(profile: ProfileRoleRow | null | undefined, email?: string | null): boolean {
  if (isNazoryAdminEmail(email ?? profile?.email)) return true;
  return isNazoryAdminRole(profile?.role);
}

export function canUseAuthorFeatures(
  profile: ProfileRoleRow | null | undefined,
  authorProfile: Pick<AuthorProfileRow, "is_active"> | null | undefined,
): boolean {
  return isAuthorRole(profile?.role) && authorProfile?.is_active === true;
}

export async function loadProfileRoleRow(
  supabase: SupabaseClient,
  userId: string,
): Promise<ProfileRoleRow | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("role, email")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return data as ProfileRoleRow;
}

export async function loadAuthorProfileRow(
  supabase: SupabaseClient,
  userId: string,
): Promise<AuthorProfileRow | null> {
  const { data, error } = await supabase
    .from("author_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return data as AuthorProfileRow;
}

export async function isNazoryAdmin(supabase: SupabaseClient, user: User): Promise<boolean> {
  const profile = await loadProfileRoleRow(supabase, user.id);
  return isNazoryAdminProfile(profile, user.email);
}

export async function isActiveAuthor(supabase: SupabaseClient, user: User): Promise<boolean> {
  const [profile, authorProfile] = await Promise.all([
    loadProfileRoleRow(supabase, user.id),
    loadAuthorProfileRow(supabase, user.id),
  ]);
  return canUseAuthorFeatures(profile, authorProfile);
}

export async function requireNazoryAdmin(supabase: SupabaseClient, user: User) {
  const allowed = await isNazoryAdmin(supabase, user);
  if (!allowed) {
    throw new AuthApiError(403, "Nemáte oprávnění spravovat sekci Názory.");
  }
}

export async function requireActiveAuthor(supabase: SupabaseClient, user: User) {
  const allowed = await isActiveAuthor(supabase, user);
  if (!allowed) {
    throw new AuthApiError(403, "Pro psaní článků potřebujete aktivní autorský účet.");
  }
}

export async function requireAuthorWithCompletedProfile(supabase: SupabaseClient, user: User) {
  await requireActiveAuthor(supabase, user);
  const profile = await loadAuthorProfileRow(supabase, user.id);
  if (!profile?.profile_completed) {
    throw new AuthApiError(403, "Nejdřív dokončete autorský profil v sekci Názory.");
  }
}

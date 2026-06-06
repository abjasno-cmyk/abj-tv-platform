import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { buildAuthorSlug } from "@/lib/nazory/slug";
import {
  AUTHOR_PROFILE_PUBLIC_COLUMNS,
  OPINION_ARTICLE_STATUS_PUBLISHED,
  type AuthorProfileInput,
  type AuthorProfileRow,
  type PublicAuthorProfile,
} from "@/lib/nazory/types";

function trimOrNull(value: string | null | undefined, maxLength?: number): string | null {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return null;
  return maxLength ? trimmed.slice(0, maxLength) : trimmed;
}

function normalizeUrl(value: string | null | undefined): string | null {
  const trimmed = trimOrNull(value, 500);
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function mapAuthorProfileToPublic(
  row: AuthorProfileRow,
  publishedArticleCount = 0,
): PublicAuthorProfile {
  return {
    userId: row.user_id,
    firstName: row.first_name,
    lastName: row.last_name,
    slug: row.slug,
    bio: row.bio,
    title: row.title,
    profession: row.profession,
    city: row.city,
    websiteUrl: row.website_url,
    facebookUrl: row.facebook_url,
    xUrl: row.x_url,
    linkedinUrl: row.linkedin_url,
    avatarStoragePath: row.avatar_storage_path,
    publishedArticleCount,
  };
}

export function getAuthorDisplayName(row: Pick<AuthorProfileRow, "first_name" | "last_name">): string {
  return [row.first_name, row.last_name].map((part) => part.trim()).filter(Boolean).join(" ");
}

async function loadTakenAuthorSlugs(supabase: SupabaseClient, excludeUserId?: string): Promise<string[]> {
  const query = supabase.from("author_profiles").select("slug, user_id");
  const { data, error } = await query;
  if (error || !data) return [];

  return (data as Array<{ slug: string; user_id: string }>)
    .filter((row) => row.user_id !== excludeUserId)
    .map((row) => row.slug);
}

async function countPublishedArticlesForAuthor(supabase: SupabaseClient, authorId: string): Promise<number> {
  const { count, error } = await supabase
    .from("opinion_articles")
    .select("id", { count: "exact", head: true })
    .eq("author_id", authorId)
    .eq("status", OPINION_ARTICLE_STATUS_PUBLISHED)
    .is("deleted_at", null);

  if (error) return 0;
  return count ?? 0;
}

export async function getAuthorProfileByUserId(
  supabase: SupabaseClient,
  userId: string,
): Promise<AuthorProfileRow | null> {
  const { data, error } = await supabase.from("author_profiles").select("*").eq("user_id", userId).maybeSingle();
  if (error || !data) return null;
  return data as AuthorProfileRow;
}

export async function getPublicAuthorBySlug(
  supabase: SupabaseClient,
  slug: string,
): Promise<PublicAuthorProfile | null> {
  const { data, error } = await supabase
    .from("author_profiles")
    .select(AUTHOR_PROFILE_PUBLIC_COLUMNS)
    .eq("slug", slug)
    .eq("is_active", true)
    .eq("profile_completed", true)
    .maybeSingle();

  if (error || !data) return null;
  const row = data as AuthorProfileRow;
  const publishedArticleCount = await countPublishedArticlesForAuthor(supabase, row.user_id);
  return mapAuthorProfileToPublic(row, publishedArticleCount);
}

export async function upsertAuthorProfile(
  supabase: SupabaseClient,
  userId: string,
  input: AuthorProfileInput,
): Promise<AuthorProfileRow> {
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  if (!firstName || !lastName) {
    throw new Error("Jméno a příjmení jsou povinné.");
  }

  const existing = await getAuthorProfileByUserId(supabase, userId);
  const takenSlugs = await loadTakenAuthorSlugs(supabase, userId);
  const slug = existing?.slug ?? buildAuthorSlug(firstName, lastName, takenSlugs);

  const payload = {
    user_id: userId,
    first_name: firstName.slice(0, 120),
    last_name: lastName.slice(0, 120),
    slug,
    bio: trimOrNull(input.bio, 500),
    title: trimOrNull(input.title, 160),
    profession: trimOrNull(input.profession, 160),
    city: trimOrNull(input.city, 120),
    website_url: normalizeUrl(input.websiteUrl),
    facebook_url: normalizeUrl(input.facebookUrl),
    x_url: normalizeUrl(input.xUrl),
    linkedin_url: normalizeUrl(input.linkedinUrl),
    contact_email: trimOrNull(input.contactEmail, 200),
    profile_completed: true,
  };

  const { data, error } = await supabase
    .from("author_profiles")
    .upsert(payload, { onConflict: "user_id" })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Nepodařilo se uložit autorský profil.");
  }

  return data as AuthorProfileRow;
}

export async function createAuthorAccount(
  supabase: SupabaseClient,
  input: {
    userId: string;
    email?: string | null;
    firstName?: string;
    lastName?: string;
  },
): Promise<AuthorProfileRow> {
  const firstName = input.firstName?.trim() || "Nový";
  const lastName = input.lastName?.trim() || "Autor";
  const takenSlugs = await loadTakenAuthorSlugs(supabase);
  const slug = buildAuthorSlug(firstName, lastName, takenSlugs);

  const profileUpdate = await supabase
    .from("profiles")
    .update({ role: "author" })
    .eq("id", input.userId);

  if (profileUpdate.error) {
    throw new Error(profileUpdate.error.message);
  }

  const { data, error } = await supabase
    .from("author_profiles")
    .upsert(
      {
        user_id: input.userId,
        first_name: firstName,
        last_name: lastName,
        slug,
        contact_email: trimOrNull(input.email, 200),
        is_active: true,
        profile_completed: false,
      },
      { onConflict: "user_id" },
    )
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Nepodařilo se vytvořit autorský účet.");
  }

  return data as AuthorProfileRow;
}

export async function setAuthorActiveState(
  supabase: SupabaseClient,
  userId: string,
  isActive: boolean,
): Promise<AuthorProfileRow> {
  const { data, error } = await supabase
    .from("author_profiles")
    .update({ is_active: isActive })
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Nepodařilo se změnit stav autora.");
  }

  return data as AuthorProfileRow;
}

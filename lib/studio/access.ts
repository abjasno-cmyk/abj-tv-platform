import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export const STUDIO_ALLOWED_EMAILS = new Set([
  "jana.bobosikova@bcmgroup.cz",
  "abjasno@gmail.com",
]);

export const STUDIO_ROLES = [
  "viewer",
  "moderator",
  "editor",
  "senior_editor",
  "analyst",
  "admin",
  "owner",
] as const;

export type StudioRole = (typeof STUDIO_ROLES)[number];
export type InternalStudioRole = Exclude<StudioRole, "viewer">;

export type StudioCapability =
  | "overview_read"
  | "automation_read"
  | "editorial_read"
  | "editorial_edit"
  | "editorial_publish"
  | "breaking_read"
  | "breaking_write"
  | "breaking_publish"
  | "program_override"
  | "video_channel_read"
  | "comments_moderate"
  | "viewers_read"
  | "viewer_sensitive_read"
  | "statistics_read"
  | "settings_read"
  | "roles_manage"
  | "audit_read";

type ProfileRow = {
  email: string | null;
  role: string | null;
  display_name: string | null;
};

export type StudioAccessContext = {
  supabase: SupabaseClient;
  user: User | null;
  email: string | null;
  displayName: string | null;
  profileRole: StudioRole;
  effectiveRoles: StudioRole[];
  isAllowlisted: boolean;
  canAccessStudio: boolean;
};

const INTERNAL_ROLES: InternalStudioRole[] = [
  "moderator",
  "editor",
  "senior_editor",
  "analyst",
  "admin",
  "owner",
];

const CAPABILITY_MATRIX: Record<StudioCapability, InternalStudioRole[]> = {
  overview_read: INTERNAL_ROLES,
  automation_read: INTERNAL_ROLES,
  editorial_read: ["editor", "senior_editor", "analyst", "admin", "owner"],
  editorial_edit: ["editor", "senior_editor", "admin", "owner"],
  editorial_publish: ["senior_editor", "admin", "owner"],
  breaking_read: ["editor", "senior_editor", "analyst", "admin", "owner"],
  breaking_write: ["editor", "senior_editor", "admin", "owner"],
  breaking_publish: ["senior_editor", "admin", "owner"],
  program_override: ["senior_editor", "admin", "owner"],
  video_channel_read: ["editor", "senior_editor", "analyst", "admin", "owner"],
  comments_moderate: ["moderator", "senior_editor", "admin", "owner"],
  viewers_read: ["analyst", "admin", "owner"],
  viewer_sensitive_read: ["admin", "owner"],
  statistics_read: ["analyst", "admin", "owner"],
  settings_read: ["admin", "owner"],
  roles_manage: ["admin", "owner"],
  audit_read: ["senior_editor", "analyst", "admin", "owner"],
};

function normalizeRole(value: string | null | undefined): StudioRole {
  if (!value) return "viewer";
  return STUDIO_ROLES.includes(value as StudioRole) ? (value as StudioRole) : "viewer";
}

function normalizeEmail(...candidates: Array<string | null | undefined>): string | null {
  for (const value of candidates) {
    if (!value) continue;
    const normalized = value.trim().toLowerCase();
    if (normalized.length > 0) return normalized;
  }
  return null;
}

function isMissingRelation(message: string | undefined): boolean {
  if (!message) return false;
  return /relation .* does not exist|column .* does not exist/i.test(message);
}

function toRoleSet(profileRole: StudioRole, extraRoles: string[]): StudioRole[] {
  const values = new Set<StudioRole>([profileRole]);
  for (const role of extraRoles) {
    values.add(normalizeRole(role));
  }
  return Array.from(values);
}

export function hasStudioCapability(context: Pick<StudioAccessContext, "effectiveRoles" | "canAccessStudio">, capability: StudioCapability): boolean {
  if (!context.canAccessStudio) return false;
  const allowed = CAPABILITY_MATRIX[capability];
  return context.effectiveRoles.some((role) => role !== "viewer" && allowed.includes(role));
}

export async function resolveStudioAccessContext(): Promise<StudioAccessContext> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      supabase,
      user: null,
      email: null,
      displayName: null,
      profileRole: "viewer",
      effectiveRoles: ["viewer"],
      isAllowlisted: false,
      canAccessStudio: false,
    };
  }

  const profileQuery = await supabase.from("profiles").select("email, role, display_name").eq("id", user.id).maybeSingle();
  const profile = (profileQuery.data ?? null) as ProfileRow | null;
  const profileRole = normalizeRole(profile?.role ?? "viewer");
  const email = normalizeEmail(user.email ?? null, profile?.email ?? null);
  const isAllowlisted = email ? STUDIO_ALLOWED_EMAILS.has(email) : false;

  const adminRolesQuery = await supabase.from("admin_roles").select("role").eq("user_id", user.id);
  const extraRoles =
    adminRolesQuery.error && isMissingRelation(adminRolesQuery.error.message)
      ? []
      : (adminRolesQuery.data ?? []).flatMap((row) => {
          if (typeof row.role === "string") return [row.role];
          return [];
        });

  let resolvedProfileRole = profileRole;
  let resolvedExtraRoles = extraRoles;

  // Self-heal allowlisted users: ensure both approved accounts always get
  // Studio access even if profile bootstrap created them as "viewer".
  if (isAllowlisted && resolvedProfileRole === "viewer") {
    const promoteProfile = await supabase
      .from("profiles")
      .update({
        role: "owner",
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)
      .eq("role", "viewer")
      .select("role")
      .maybeSingle();
    if (!promoteProfile.error && promoteProfile.data?.role) {
      resolvedProfileRole = normalizeRole(promoteProfile.data.role);
    } else {
      // Fallback for first request even when DB update is delayed.
      resolvedProfileRole = "owner";
    }
  }

  if (isAllowlisted && !resolvedExtraRoles.includes("owner")) {
    const grantOwner = await supabase.from("admin_roles").upsert(
      {
        user_id: user.id,
        role: "owner",
        created_by: user.id,
      },
      { onConflict: "user_id,role" },
    );
    if (!grantOwner.error) {
      resolvedExtraRoles = [...resolvedExtraRoles, "owner"];
    }
  }

  const effectiveRoles = toRoleSet(resolvedProfileRole, resolvedExtraRoles);
  const hasInternalRole = effectiveRoles.some((role) => role !== "viewer");
  const canAccessStudio = isAllowlisted && hasInternalRole;

  return {
    supabase,
    user,
    email,
    displayName: profile?.display_name ?? null,
    profileRole: resolvedProfileRole,
    effectiveRoles,
    isAllowlisted,
    canAccessStudio,
  };
}

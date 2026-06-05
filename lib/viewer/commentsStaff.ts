/** Must stay in sync with STUDIO_ALLOWED_EMAILS in lib/studio/access.ts */
const STAFF_COMMENT_EMAILS = new Set(["abjasno@gmail.com"]);

const MODERATOR_PROFILE_ROLES = new Set(["moderator", "admin", "owner"]);

function normalizeEmail(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

export function isStaffCommentAuthor(
  profile: { email: string | null; role: string | null } | null | undefined,
  userEmail?: string | null,
): boolean {
  const email = normalizeEmail(profile?.email ?? userEmail ?? null);
  if (email && STAFF_COMMENT_EMAILS.has(email)) return true;
  const role = profile?.role?.trim().toLowerCase() ?? "";
  return MODERATOR_PROFILE_ROLES.has(role);
}

import { headers } from "next/headers";

export type SessionUser = {
  id: string;
  name: string;
  email?: string | null;
  isModerator: boolean;
};

function getBool(value: string | null): boolean {
  return value === "1" || value === "true" || value === "yes";
}

/**
 * Temporary auth bridge for scaffold phase.
 * Step 2 intentionally does not replace existing auth stack.
 * Later this can be swapped to NextAuth session lookup.
 */
export async function getSessionUserFromHeaders(): Promise<SessionUser | null> {
  const hdrs = await headers();
  const id = hdrs.get("x-user-id");
  if (!id) return null;
  return {
    id,
    name: hdrs.get("x-user-name") ?? "ABJ User",
    email: hdrs.get("x-user-email"),
    isModerator: getBool(hdrs.get("x-user-moderator")),
  };
}

export async function getCurrentUserIdentity(): Promise<SessionUser | null> {
  return getSessionUserFromHeaders();
}

export async function getSessionUser(): Promise<SessionUser | null> {
  return getSessionUserFromHeaders();
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  return getSessionUserFromHeaders();
}

export async function requireSessionUserId(): Promise<string | null> {
  const user = await getSessionUserFromHeaders();
  return user?.id ?? null;
}

export async function getSessionUserOrThrow(): Promise<SessionUser> {
  const user = await getSessionUserFromHeaders();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}

export function ensureModerationAccess(
  user: SessionUser | null
): { ok: true } | { ok: false; status: number; error: string } {
  if (!user) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  if (!user.isModerator) {
    return { ok: false, status: 403, error: "Forbidden" };
  }
  return { ok: true };
}


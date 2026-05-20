import "server-only";

import type { User } from "@supabase/supabase-js";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export class AuthApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function requireAuthenticatedUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw new AuthApiError(401, "Přihlášení vypršelo. Přihlaste se prosím znovu.");
  }
  if (!user) {
    throw new AuthApiError(401, "Pro tuto akci je potřeba přihlášení zdarma.");
  }

  return { supabase, user };
}

function pickFromMetadata(metadata: Record<string, unknown> | undefined, key: string): string | null {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export function deriveProfileFromUser(user: User): {
  email: string | null;
  displayName: string;
  avatarUrl: string | null;
  provider: string;
} {
  const email = typeof user.email === "string" && user.email.trim().length > 0 ? user.email.trim() : null;
  const metadata = user.user_metadata ?? {};
  const appMetadata = user.app_metadata ?? {};
  const displayName =
    pickFromMetadata(metadata, "full_name") ??
    pickFromMetadata(metadata, "name") ??
    pickFromMetadata(metadata, "user_name") ??
    (email ? email.split("@")[0] : "Divák VEROX");

  const avatarUrl =
    pickFromMetadata(metadata, "avatar_url") ??
    pickFromMetadata(metadata, "picture") ??
    pickFromMetadata(metadata, "profile_image");

  const provider =
    (typeof appMetadata.provider === "string" && appMetadata.provider.trim().length > 0
      ? appMetadata.provider.trim()
      : null) ??
    (Array.isArray(appMetadata.providers) && typeof appMetadata.providers[0] === "string"
      ? appMetadata.providers[0]
      : null) ??
    "email";

  return {
    email,
    displayName,
    avatarUrl,
    provider,
  };
}

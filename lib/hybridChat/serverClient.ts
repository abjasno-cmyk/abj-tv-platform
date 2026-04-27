import { createClient } from "@supabase/supabase-js";

function sanitize(value?: string): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  const eq = trimmed.indexOf("=");
  const maybeAssigned = eq > 0 && /^[A-Z0-9_]+$/.test(trimmed.slice(0, eq)) ? trimmed.slice(eq + 1).trim() : trimmed;
  if ((maybeAssigned.startsWith('"') && maybeAssigned.endsWith('"')) || (maybeAssigned.startsWith("'") && maybeAssigned.endsWith("'"))) {
    return maybeAssigned.slice(1, -1).trim();
  }
  return maybeAssigned;
}

export function createSupabaseServiceRoleClient() {
  const supabaseUrl = sanitize(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceRoleKey = sanitize(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }
  return createClient(supabaseUrl, serviceRoleKey);
}

function resolveRealtimeJwtSecret(): string | null {
  const direct = sanitize(process.env.SUPABASE_REALTIME_JWT_SECRET);
  if (direct) return direct;
  return sanitize(process.env.REALTIME_JWT_SECRET) ?? null;
}

function encodeBase64Url(input: string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

export function createHybridRealtimeToken(userId: string): string | null {
  const secret = resolveRealtimeJwtSecret();
  if (!secret) return null;

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    aud: "authenticated",
    role: "authenticated",
    sub: userId,
    iat: now,
    exp: now + 60 * 60, // 1h
  };

  const encodedHeader = encodeBase64Url(JSON.stringify(header));
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const content = `${encodedHeader}.${encodedPayload}`;

  const crypto = require("crypto") as typeof import("crypto");
  const signature = crypto
    .createHmac("sha256", secret)
    .update(content)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${content}.${signature}`;
}

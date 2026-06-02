import "server-only";

import crypto from "node:crypto";

const STUDIO_GATE_COOKIE = "verox_studio_gate";
const STUDIO_GATE_MAX_AGE_SECONDS = 60 * 60 * 12;

type StudioGateConfig = {
  credential: string;
  password: string;
  secret: string;
};

/**
 * Resolve the gate configuration from the environment. All three values are
 * required and have NO fallbacks — the gate fails closed (returns null) when
 * any is missing. The signing secret MUST be a dedicated value; reusing the
 * public NEXT_PUBLIC_SUPABASE_ANON_KEY would let anyone forge the gate cookie.
 */
function resolveStudioGateConfig(): StudioGateConfig | null {
  const credential = process.env.STUDIO_GATE_CREDENTIAL?.trim();
  const password = process.env.STUDIO_GATE_PASSWORD?.trim();
  const secret = process.env.STUDIO_GATE_SECRET?.trim();
  if (!credential || !password || !secret) {
    return null;
  }
  return { credential, password, secret };
}

export function isStudioGateConfigured(): boolean {
  return resolveStudioGateConfig() !== null;
}

function toDigest(value: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function getStudioGateCookieName(): string {
  return STUDIO_GATE_COOKIE;
}

export function getStudioGateMaxAgeSeconds(): number {
  return STUDIO_GATE_MAX_AGE_SECONDS;
}

/**
 * Returns the gate token, or null when the gate is not configured. Callers
 * must treat null as "cannot unlock" rather than minting a forgeable token.
 */
export function createStudioGateToken(): string | null {
  const config = resolveStudioGateConfig();
  if (!config) return null;
  return toDigest(`${config.credential}::${config.password}`, config.secret);
}

export function isStudioGateTokenValid(token: string | null | undefined): boolean {
  if (!token) return false;
  const expected = createStudioGateToken();
  if (!expected) return false;
  return safeEqual(token, expected);
}

export function validateStudioGateInput(credential: string, password: string): boolean {
  const config = resolveStudioGateConfig();
  if (!config) return false;
  return safeEqual(credential.trim(), config.credential) && safeEqual(password.trim(), config.password);
}

export function readCookieValueFromHeader(cookieHeader: string | null, cookieName: string): string | null {
  if (!cookieHeader) return null;
  for (const chunk of cookieHeader.split(";")) {
    const [rawKey, ...rest] = chunk.trim().split("=");
    if (rawKey !== cookieName) continue;
    const value = rest.join("=");
    if (!value) return null;
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }
  return null;
}

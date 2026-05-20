import "server-only";

import crypto from "node:crypto";

const STUDIO_GATE_COOKIE = "verox_studio_gate";
const STUDIO_GATE_MAX_AGE_SECONDS = 60 * 60 * 12;

const STUDIO_GATE_CREDENTIAL =
  process.env.STUDIO_GATE_CREDENTIAL?.trim() || "JanaBobošíková29081964*HanaLipovská";
const STUDIO_GATE_PASSWORD = process.env.STUDIO_GATE_PASSWORD?.trim() || "VeroX29081964*";
const STUDIO_GATE_SECRET =
  process.env.STUDIO_GATE_SECRET?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "verox-studio-gate";

function toDigest(value: string): string {
  return crypto.createHmac("sha256", STUDIO_GATE_SECRET).update(value).digest("hex");
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

export function createStudioGateToken(): string {
  return toDigest(`${STUDIO_GATE_CREDENTIAL}::${STUDIO_GATE_PASSWORD}`);
}

export function isStudioGateTokenValid(token: string | null | undefined): boolean {
  if (!token) return false;
  return safeEqual(token, createStudioGateToken());
}

export function validateStudioGateInput(credential: string, password: string): boolean {
  return safeEqual(credential.trim(), STUDIO_GATE_CREDENTIAL) && safeEqual(password.trim(), STUDIO_GATE_PASSWORD);
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

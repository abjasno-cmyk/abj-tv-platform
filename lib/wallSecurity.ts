import crypto from "node:crypto";

import type { WallIdentityMeta } from "@/lib/wallTypes";

function readHeader(request: Request, key: string): string | null {
  const value = request.headers.get(key);
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function resolveClientIp(request: Request): string | null {
  const xForwardedFor = readHeader(request, "x-forwarded-for");
  if (xForwardedFor) {
    const first = xForwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }
  return readHeader(request, "x-real-ip");
}

function hashWithSalt(value: string): string {
  const salt = process.env.WALL_HASH_SALT ?? process.env.SESSION_SECRET ?? "abj-wall-fallback-salt";
  return crypto.createHash("sha256").update(`${salt}:${value}`).digest("hex");
}

export function buildWallIdentityMeta(request: Request): WallIdentityMeta {
  const ip = resolveClientIp(request);
  const userAgent = readHeader(request, "user-agent");
  const sessionBase = `${ip ?? "unknown-ip"}|${userAgent ?? "unknown-ua"}`;

  return {
    ipHash: ip ? hashWithSalt(`ip:${ip}`) : null,
    userAgentHash: userAgent ? hashWithSalt(`ua:${userAgent}`) : null,
    sessionHash: hashWithSalt(`session:${sessionBase}`),
  };
}

export function sanitizeWallText(value: string): string {
  return value
    .replace(/\u0000/g, "")
    .replace(/<[^>]*>/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, " ")
    .trim();
}


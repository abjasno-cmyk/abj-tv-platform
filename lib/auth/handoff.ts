import { createHmac, timingSafeEqual } from "node:crypto";

import { isVercelGitBranchPreviewHost } from "@/lib/deploymentHost";

const HANDOFF_TTL_MS = 60_000;

export const PREVIEW_ORIGIN_QUERY_PARAM = "preview_origin";

export type AuthHandoffPayload = {
  accessToken: string;
  refreshToken: string;
  returnPath: string;
  returnOrigin: string;
  exp: number;
};

export type PreviewHandoffTarget = {
  returnOrigin: string;
  returnPath: string;
};

function handoffSecret(): string {
  return (
    process.env.AUTH_HANDOFF_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    ""
  );
}

function signPayload(encodedPayload: string): string {
  const secret = handoffSecret();
  if (!secret) {
    throw new Error("AUTH_HANDOFF_SECRET is not configured.");
  }
  return createHmac("sha256", secret).update(encodedPayload).digest("base64url");
}

export function isAllowedPreviewReturnOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    if (url.protocol !== "https:") return false;
    return isVercelGitBranchPreviewHost(url.host);
  } catch {
    return false;
  }
}

function sanitizeReturnPath(value: string | null | undefined, fallback = "/live"): string {
  if (!value?.trim()) return fallback;
  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return fallback;
  return trimmed;
}

export function createAuthHandoffToken(input: {
  accessToken: string;
  refreshToken: string;
  returnPath: string;
  returnOrigin: string;
}): string {
  if (!isAllowedPreviewReturnOrigin(input.returnOrigin)) {
    throw new Error("Handoff target is not an allowed preview origin.");
  }

  const payload: AuthHandoffPayload = {
    accessToken: input.accessToken,
    refreshToken: input.refreshToken,
    returnPath: sanitizeReturnPath(input.returnPath, "/live"),
    returnOrigin: input.returnOrigin.replace(/\/+$/, ""),
    exp: Date.now() + HANDOFF_TTL_MS,
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = signPayload(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifyAuthHandoffToken(token: string): AuthHandoffPayload | null {
  const secret = handoffSecret();
  if (!secret) return null;

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;

  const expected = signPayload(encodedPayload);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as AuthHandoffPayload;
    if (!payload.accessToken || !payload.refreshToken || !payload.returnOrigin || !payload.returnPath) {
      return null;
    }
    if (payload.exp < Date.now()) return null;
    if (!isAllowedPreviewReturnOrigin(payload.returnOrigin)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function resolveProductionAuthOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  if (fromEnv) return fromEnv;
  return "https://www.verox.cz";
}

const LEGACY_PREVIEW_HANDOFF_NEXT_PREFIX = "/api/auth/preview-continue";

/** @deprecated Legacy nested-next format; kept for in-flight OAuth redirects. */
export function parsePreviewHandoffNext(next: string): PreviewHandoffTarget | null {
  if (!next.startsWith(LEGACY_PREVIEW_HANDOFF_NEXT_PREFIX)) return null;

  const query = next.includes("?") ? next.slice(next.indexOf("?") + 1) : "";
  const params = new URLSearchParams(query);
  const returnOrigin = params.get("returnOrigin") ?? params.get("preview_origin");
  const returnPath = params.get("returnPath") ?? params.get("next");
  if (!returnOrigin || !returnPath) return null;
  if (!isAllowedPreviewReturnOrigin(returnOrigin)) return null;

  return {
    returnOrigin: returnOrigin.replace(/\/+$/, ""),
    returnPath: sanitizeReturnPath(returnPath, "/live"),
  };
}

export function parsePreviewHandoffRequest(
  searchParams: URLSearchParams,
  nextPath: string,
): PreviewHandoffTarget | null {
  const previewOrigin =
    searchParams.get(PREVIEW_ORIGIN_QUERY_PARAM) ??
    searchParams.get("returnOrigin") ??
    searchParams.get("preview_origin");

  if (previewOrigin && isAllowedPreviewReturnOrigin(previewOrigin)) {
    return {
      returnOrigin: previewOrigin.replace(/\/+$/, ""),
      returnPath: sanitizeReturnPath(nextPath, "/live"),
    };
  }

  return parsePreviewHandoffNext(nextPath);
}

export function parsePreviewHandoffQuery(
  searchParams: URLSearchParams,
): PreviewHandoffTarget | null {
  const returnOrigin =
    searchParams.get("returnOrigin") ??
    searchParams.get(PREVIEW_ORIGIN_QUERY_PARAM) ??
    searchParams.get("preview_origin");
  const returnPath = searchParams.get("returnPath") ?? searchParams.get("next");
  if (!returnOrigin || !returnPath) return null;
  if (!isAllowedPreviewReturnOrigin(returnOrigin)) return null;

  return {
    returnOrigin: returnOrigin.replace(/\/+$/, ""),
    returnPath: sanitizeReturnPath(returnPath, "/live"),
  };
}

export function buildPreviewHandoffCallbackUrl(input: {
  productionOrigin: string;
  previewOrigin: string;
  returnPath: string;
}): string {
  const url = new URL(`${input.productionOrigin.replace(/\/+$/, "")}/auth/callback`);
  url.searchParams.set("next", sanitizeReturnPath(input.returnPath, "/live"));
  url.searchParams.set(PREVIEW_ORIGIN_QUERY_PARAM, input.previewOrigin.replace(/\/+$/, ""));
  return url.toString();
}

export function buildAuthCompleteUrl(returnOrigin: string, handoffToken: string): string {
  return `${returnOrigin.replace(/\/+$/, "")}/auth/complete?handoff=${encodeURIComponent(handoffToken)}`;
}

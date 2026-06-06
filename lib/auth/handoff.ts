import { createHmac, timingSafeEqual } from "node:crypto";

import { isVercelGitBranchPreviewHost } from "@/lib/deploymentHost";

const HANDOFF_TTL_MS = 60_000;

export type AuthHandoffPayload = {
  accessToken: string;
  refreshToken: string;
  returnPath: string;
  returnOrigin: string;
  exp: number;
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
    returnPath: input.returnPath.startsWith("/") ? input.returnPath : "/live",
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

const PREVIEW_HANDOFF_NEXT_PREFIX = "/api/auth/preview-continue";

export function parsePreviewHandoffNext(
  next: string,
): { returnOrigin: string; returnPath: string } | null {
  if (!next.startsWith(PREVIEW_HANDOFF_NEXT_PREFIX)) return null;

  const query = next.includes("?") ? next.slice(next.indexOf("?") + 1) : "";
  const params = new URLSearchParams(query);
  const returnOrigin = params.get("returnOrigin") ?? params.get("preview_origin");
  const returnPath = params.get("returnPath") ?? params.get("next");
  if (!returnOrigin || !returnPath) return null;
  if (!isAllowedPreviewReturnOrigin(returnOrigin)) return null;

  const safePath = returnPath.trim().startsWith("/") && !returnPath.trim().startsWith("//")
    ? returnPath.trim()
    : "/live";

  return {
    returnOrigin: returnOrigin.replace(/\/+$/, ""),
    returnPath: safePath,
  };
}

export function buildAuthCompleteUrl(returnOrigin: string, handoffToken: string): string {
  return `${returnOrigin.replace(/\/+$/, "")}/auth/complete?handoff=${encodeURIComponent(handoffToken)}`;
}

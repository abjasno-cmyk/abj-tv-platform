import { isVercelGitBranchPreviewHost } from "@/lib/deploymentHost";
import { buildPreviewHandoffNextPath, resolveProductionAuthOrigin } from "@/lib/auth/handoff";

export const OAUTH_RETURN_PATH_COOKIE = "verox_oauth_next";
export const OAUTH_RETURN_PATH_STORAGE_KEY = "verox_oauth_next_v1";

export function sanitizeOAuthReturnPath(value: string | null | undefined): string {
  if (!value) return "/live";
  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return "/live";
  return trimmed;
}

export function buildOAuthCallbackUrl(origin: string, returnPath: string): string {
  const safePath = sanitizeOAuthReturnPath(returnPath);
  return `${origin.replace(/\/+$/, "")}/auth/callback?next=${encodeURIComponent(safePath)}`;
}

/**
 * On Vercel preview deployments Supabase often only whitelists the production
 * callback URL. Route OAuth through production, then hand off the session back
 * to the preview origin. Set NEXT_PUBLIC_PREVIEW_AUTH_HANDOFF=false to force a
 * direct preview callback (requires the preview URL in Supabase Redirect URLs).
 */
export function shouldUsePreviewAuthHandoff(host: string): boolean {
  if (!isVercelGitBranchPreviewHost(host)) return false;
  if (process.env.NEXT_PUBLIC_PREVIEW_AUTH_HANDOFF === "false") return false;
  return true;
}

/**
 * Supabase → Authentication → URL Configuration → Redirect URLs:
 *   https://www.verox.cz/auth/callback
 *   https://**-git-**.vercel.app/auth/callback
 */
export function buildOAuthRedirectToForBrowser(input: {
  host: string;
  origin: string;
  returnPath: string;
}): string {
  const safePath = sanitizeOAuthReturnPath(input.returnPath);

  if (shouldUsePreviewAuthHandoff(input.host)) {
    const previewOrigin = input.origin.replace(/\/+$/, "");
    const productionOrigin = resolveProductionAuthOrigin();
    const handoffPath = buildPreviewHandoffNextPath(previewOrigin, safePath);
    return buildOAuthCallbackUrl(productionOrigin, handoffPath);
  }

  return buildOAuthCallbackUrl(input.origin, safePath);
}

export function rememberOAuthReturnPath(returnPath: string): void {
  if (typeof window === "undefined") return;
  const safePath = sanitizeOAuthReturnPath(returnPath);
  try {
    window.sessionStorage.setItem(OAUTH_RETURN_PATH_STORAGE_KEY, safePath);
    document.cookie = `${OAUTH_RETURN_PATH_COOKIE}=${encodeURIComponent(safePath)}; Path=/; Max-Age=900; SameSite=Lax; Secure`;
  } catch {
    // Best-effort only.
  }
}

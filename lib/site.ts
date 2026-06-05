export {
  CANONICAL_HOST,
  SITE_URL,
  LEGACY_VERCEL_HOST_PATTERN,
  PRODUCTION_LEGACY_VERCEL_HOST,
  isVercelGitBranchPreviewHost,
  resolveAuthOriginForHost,
  shouldCanonicalizeAuthHost,
  shouldPreserveAuthOnHost,
} from "@/lib/deploymentHost";

/**
 * Kam poslat uživatele po OAuth callbacku. Vždy stejný host jako request —
 * OAuth nesmí přesměrovat na jinou doménu (preview / produkce).
 */
export function resolveAuthCallbackOrigin(requestUrl: URL): string {
  const protocol = requestUrl.protocol || "https:";
  return `${protocol}//${requestUrl.host}`;
}

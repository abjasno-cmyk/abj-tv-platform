export {
  CANONICAL_HOST,
  SITE_URL,
  LEGACY_VERCEL_HOST_PATTERN,
  isVercelGitBranchPreviewHost,
  resolveAuthOriginForHost,
  shouldPreserveAuthOnHost,
} from "@/lib/deploymentHost";

import { resolveAuthOriginForHost } from "@/lib/deploymentHost";

/**
 * Kam poslat uživatele po OAuth callbacku. Na preview deploymentu musí zůstat
 * stejný host (jinak skončí na produkci bez kódu z PR větve).
 */
export function resolveAuthCallbackOrigin(requestUrl: URL, vercelEnv = process.env.VERCEL_ENV): string {
  return resolveAuthOriginForHost(requestUrl.host, requestUrl.protocol || "https:", vercelEnv);
}

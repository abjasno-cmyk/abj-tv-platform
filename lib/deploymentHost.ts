// Jeden zdroj pravdy pro kanonickou doménu webu. Pro přesun na verox.cz stačí
// nastavit env (na produkčním deploymentu ve Vercelu):
//   NEXT_PUBLIC_CANONICAL_HOST=verox.cz
//   NEXT_PUBLIC_SITE_URL=https://verox.cz

export const CANONICAL_HOST = (
  process.env.NEXT_PUBLIC_CANONICAL_HOST ?? "abj-tv-platform-n7e8.vercel.app"
)
  .trim()
  .toLowerCase();

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? `https://${CANONICAL_HOST}`
).replace(/\/+$/, "");

export const LEGACY_VERCEL_HOST_PATTERN = /^abj-tv-platform-n7e8(?:-[a-z0-9-]+)?\.vercel\.app$/i;

/** Vercel PR / branch preview URLs contain `-git-` (e.g. *-git-cursor-foo.vercel.app). */
export function isVercelGitBranchPreviewHost(host: string): boolean {
  const normalized = host.trim().toLowerCase();
  return normalized.includes("-git-") && normalized.endsWith(".vercel.app");
}

export function shouldPreserveAuthOnHost(
  host: string,
  vercelEnv?: string | null,
): boolean {
  const env = vercelEnv?.trim().toLowerCase() ?? "";
  if (env === "preview" || env === "development") return true;
  if (isVercelGitBranchPreviewHost(host)) return true;
  return false;
}

export function resolveAuthOriginForHost(
  host: string,
  protocol = "https:",
  vercelEnv?: string | null,
): string {
  if (shouldPreserveAuthOnHost(host, vercelEnv)) {
    return `${protocol}//${host}`;
  }

  const normalizedHost = host.trim().toLowerCase();
  const shouldCanonicalize =
    LEGACY_VERCEL_HOST_PATTERN.test(normalizedHost) && normalizedHost !== CANONICAL_HOST;

  return `${protocol}//${shouldCanonicalize ? CANONICAL_HOST : host}`;
}

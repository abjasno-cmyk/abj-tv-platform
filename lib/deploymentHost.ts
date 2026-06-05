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

/** Bare production Vercel alias (no branch suffix). */
export const PRODUCTION_LEGACY_VERCEL_HOST = "abj-tv-platform-n7e8.vercel.app";

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

  const normalizedHost = host.trim().toLowerCase();
  // Any other legacy Vercel deployment URL (branch builds, hashes) — stay put.
  if (
    LEGACY_VERCEL_HOST_PATTERN.test(normalizedHost) &&
    normalizedHost !== PRODUCTION_LEGACY_VERCEL_HOST
  ) {
    return true;
  }

  return false;
}

export function shouldCanonicalizeAuthHost(
  host: string,
  vercelEnv?: string | null,
): boolean {
  if (shouldPreserveAuthOnHost(host, vercelEnv)) return false;
  const env = vercelEnv?.trim().toLowerCase() ?? "";
  if (env !== "production") return false;
  return host.trim().toLowerCase() === PRODUCTION_LEGACY_VERCEL_HOST;
}

export function resolveAuthOriginForHost(
  host: string,
  protocol = "https:",
  vercelEnv?: string | null,
): string {
  if (shouldPreserveAuthOnHost(host, vercelEnv)) {
    return `${protocol}//${host}`;
  }

  if (shouldCanonicalizeAuthHost(host, vercelEnv)) {
    return `${protocol}//${CANONICAL_HOST}`;
  }

  return `${protocol}//${host}`;
}

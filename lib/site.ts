// Jeden zdroj pravdy pro kanonickou doménu webu. Pro přesun na verox.cz stačí
// nastavit env (na produkčním deploymentu ve Vercelu):
//   NEXT_PUBLIC_CANONICAL_HOST=verox.cz
//   NEXT_PUBLIC_SITE_URL=https://verox.cz
// Bez env zůstává původní vercel host (žádná změna chování).

export const CANONICAL_HOST = (
  process.env.NEXT_PUBLIC_CANONICAL_HOST ?? "abj-tv-platform-n7e8.vercel.app"
)
  .trim()
  .toLowerCase();

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? `https://${CANONICAL_HOST}`
).replace(/\/+$/, "");

// Hosty starého vercel projektu, které chceme sjednotit na CANONICAL_HOST.
export const LEGACY_VERCEL_HOST_PATTERN = /^abj-tv-platform-n7e8(?:-[a-z0-9-]+)?\.vercel\.app$/i;

/**
 * Kam poslat uživatele po OAuth callbacku. Na preview deploymentu musí zůstat
 * stejný host (jinak skončí na produkci bez kódu z PR větve).
 */
export function resolveAuthCallbackOrigin(requestUrl: URL, vercelEnv = process.env.VERCEL_ENV): string {
  const protocol = requestUrl.protocol || "https:";
  const requestHost = requestUrl.host.toLowerCase();

  if (vercelEnv === "preview") {
    return `${protocol}//${requestUrl.host}`;
  }

  const shouldCanonicalizeHost =
    LEGACY_VERCEL_HOST_PATTERN.test(requestHost) && requestHost !== CANONICAL_HOST;

  return `${protocol}//${shouldCanonicalizeHost ? CANONICAL_HOST : requestUrl.host}`;
}

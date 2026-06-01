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

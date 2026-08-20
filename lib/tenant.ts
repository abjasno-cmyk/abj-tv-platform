// Tenant = jedna vertikála (VEROX, ProudX, …) běžící ze společného kódu.
// Vertikálu vybírá NEXT_PUBLIC_TENANT nastavená na deploymentu (každý Vercel
// projekt = jedna vertikála). Bez ní běží VEROX, takže současná produkce se
// touto vrstvou nijak nemění.
//
// ponytail: config v kódu, ne v DB — verzované, PR-ovatelné klientkami;
// DB tabulka tenants přijde až s admin/provisioning fází po launchi.

export type TenantId = "verox" | "proudx";

export type ModuleKey =
  | "noviny" // /noviny + importní crony
  | "nazory" // /nazory, autoři
  | "komunita" // můj účet, zeď, ABJ X
  | "kanaly" // přehled zdrojových kanálů
  | "studio" // interní studio/admin
  | "auth"; // přihlašování diváků (modal, session cookies)

export type TenantConfig = {
  id: TenantId;
  siteName: string;
  tagline: string;
  title: string;
  description: string;
  logoSrc: string;
  /** Favicon (SVG) — nahrazuje dřívější file-convention app/icon.svg. */
  iconSrc: string;
  /** OG/twitter obrázek; null = bez og:image (dokud značka nedodá vizuál). */
  ogImageSrc: string | null;
  /** Akcentní barva značky — přepisuje CSS proměnnou --vx-orange. */
  brandColor: string;
  modules: Record<ModuleKey, boolean>;
  /**
   * Povolené prefixy stránek. null = vše povoleno (VEROX). U vertikály
   * s allowlistem vrací proxy ostatní stránky jako 404 — obsah vypnutých
   * modulů nesmí být na politicky odlišné doméně vůbec dosažitelný.
   * API routy tímto negatujeme (crony mají vlastní no-op; tvrdé oddělení
   * API přijde s RLS/tenant fází po launchi).
   */
  pageAllowPrefixes: readonly string[] | null;
};

const VEROX: TenantConfig = {
  id: "verox",
  siteName: "VEROX",
  tagline: "MAINSTREAMOVÝ DETOX",
  title: "VEROX • Mainstreamový detox",
  description:
    "Mainstreamový detox — živé vysílání, videa a souhrny v kostce z alternativních kanálů.",
  logoSrc: "/design/brand/verox-logo.png",
  iconSrc: "/design/brand/verox-icon.svg",
  ogImageSrc: "/design/brand/verox-og.png",
  brandColor: "#ff6600",
  modules: {
    noviny: true,
    nazory: true,
    komunita: true,
    kanaly: true,
    studio: true,
    auth: true,
  },
  pageAllowPrefixes: null,
};

// MVP srpen: jen live + VOD, bez přihlášení. Texty a logo dodají klientky
// (úkol 5 rozpisu) — do té doby neutrální placeholdery.
const PROUDX: TenantConfig = {
  id: "proudx",
  siteName: "ProudX",
  tagline: "ZŮSTAŇTE V PROUDU",
  title: "ProudX • Živé vysílání a videa",
  description:
    "ProudX — nová internetová televize. Nepřetržité živé vysílání a katalog videí na jednom místě.",
  logoSrc: "/design/brand/proudx-logo.svg",
  iconSrc: "/design/brand/proudx-logo.svg",
  ogImageSrc: "/design/brand/proudx-og.png",
  brandColor: "#1c64f2",
  modules: {
    noviny: false,
    nazory: false,
    komunita: false,
    kanaly: false,
    studio: false,
    auth: false,
  },
  pageAllowPrefixes: [
    "/live",
    "/videa",
    "/video",
    "/videos",
    "/archiv",
    "/program",
    "/privacy",
    "/terms",
    "/data-deletion",
    "/sitemap-videos.xml",
    "/sitemap.xml",
    "/robots.txt",
    "/about",
    "/launch",
  ],
};

const TENANTS: Record<TenantId, TenantConfig> = { verox: VEROX, proudx: PROUDX };

export function resolveTenant(env = process.env.NEXT_PUBLIC_TENANT): TenantConfig {
  const id = (env ?? "").trim().toLowerCase();
  return TENANTS[id as TenantId] ?? VEROX;
}

export const TENANT: TenantConfig = resolveTenant();

export function moduleEnabled(module: ModuleKey, tenant: TenantConfig = TENANT): boolean {
  return tenant.modules[module];
}

/** Stránkový gating pro proxy. Root ("/") a Next interní cesty jsou vždy povolené. */
export function isPageAllowed(pathname: string, tenant: TenantConfig = TENANT): boolean {
  if (tenant.pageAllowPrefixes === null) return true;
  if (pathname === "/" || pathname.startsWith("/api/") || pathname.startsWith("/_next")) {
    return true;
  }
  return tenant.pageAllowPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

// API cesty patřící jednotlivým modulům. Když je modul na vertikále vypnutý,
// jeho API routy vrátí 404 — jinak by šly přímo na sdílenou DB (část přes
// service_role, tedy i zápisy), přestože stránky modulu jsou nedostupné.
const MODULE_API_PREFIXES: Partial<Record<ModuleKey, readonly string[]>> = {
  noviny: ["/api/noviny", "/api/admin/noviny"],
  nazory: ["/api/nazory"],
  komunita: ["/api/wall", "/api/abj-x", "/api/admin/wall", "/api/viewer"],
  studio: ["/api/studio", "/api/admin/sources"],
  auth: ["/api/auth"],
};

/** API gating pro proxy: 404 pro API cesty vypnutých modulů této vertikály. */
export function isApiPathAllowed(pathname: string, tenant: TenantConfig = TENANT): boolean {
  if (!pathname.startsWith("/api/")) return true;
  for (const [mod, prefixes] of Object.entries(MODULE_API_PREFIXES)) {
    if (moduleEnabled(mod as ModuleKey, tenant)) continue;
    if (prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
      return false;
    }
  }
  return true;
}

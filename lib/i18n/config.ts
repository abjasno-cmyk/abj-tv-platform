export const LOCALE_CS = "cs" as const;
export const LOCALE_EN = "en" as const;

export type VeroxLocale = typeof LOCALE_CS | typeof LOCALE_EN;

const DEFAULT_ENGLISH_HOSTS = ["veroxmed.com", "www.veroxmed.com"];

export function isEnglishSiteEnabled(): boolean {
  const value = process.env.VEROX_EN_ENABLED?.trim().toLowerCase();
  return value !== "false" && value !== "0" && value !== "no";
}

export function englishHosts(): string[] {
  const configured = process.env.VEROX_EN_HOSTS?.split(",").map((host) => host.trim().toLowerCase()).filter(Boolean);
  return configured && configured.length > 0 ? configured : DEFAULT_ENGLISH_HOSTS;
}

export function normalizeHost(host: string | null | undefined): string {
  return (host ?? "").split(":")[0]?.trim().toLowerCase() ?? "";
}

export function resolveLocaleFromHostPath(host: string | null | undefined, pathname: string | null | undefined): VeroxLocale {
  if (!isEnglishSiteEnabled()) return LOCALE_CS;

  const normalizedHost = normalizeHost(host);
  if (englishHosts().includes(normalizedHost)) return LOCALE_EN;

  const normalizedPath = pathname?.trim() || "/";
  if (normalizedPath === "/en" || normalizedPath.startsWith("/en/")) return LOCALE_EN;

  return LOCALE_CS;
}

export function isEnglishLocale(locale: VeroxLocale): boolean {
  return locale === LOCALE_EN;
}

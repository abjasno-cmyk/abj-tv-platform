import { LOCALE_EN, type VeroxLocale } from "@/lib/i18n/config";

export function localizedPath(locale: VeroxLocale, path: string): string {
  if (locale !== LOCALE_EN) return path;
  if (!path.startsWith("/")) return path;
  if (path === "/en" || path.startsWith("/en/")) return path;
  return `/en${path}`;
}

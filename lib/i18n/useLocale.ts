"use client";

import { usePathname } from "next/navigation";

import { LOCALE_CS, LOCALE_EN, resolveLocaleFromHostPath, type VeroxLocale } from "@/lib/i18n/config";

export function useLocale(): VeroxLocale {
  const pathname = usePathname();
  if (pathname === "/en" || pathname.startsWith("/en/")) return LOCALE_EN;
  if (typeof window !== "undefined") {
    const browserPathname = window.location.pathname;
    if (browserPathname === "/en" || browserPathname.startsWith("/en/")) return LOCALE_EN;
    return resolveLocaleFromHostPath(window.location.host, browserPathname || pathname);
  }
  return LOCALE_CS;
}

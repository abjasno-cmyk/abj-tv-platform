import "server-only";

import { headers } from "next/headers";

import { LOCALE_CS, resolveLocaleFromHostPath, type VeroxLocale } from "@/lib/i18n/config";

export async function getRequestLocale(): Promise<VeroxLocale> {
  try {
    const headerStore = await headers();
    const host = headerStore.get("x-verox-host") ?? headerStore.get("x-forwarded-host") ?? headerStore.get("host");
    const pathname = headerStore.get("x-verox-pathname") ?? headerStore.get("x-invoke-path") ?? headerStore.get("x-matched-path") ?? "/";
    return resolveLocaleFromHostPath(host, pathname);
  } catch {
    return LOCALE_CS;
  }
}

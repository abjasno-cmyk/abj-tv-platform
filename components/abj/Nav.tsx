"use client";

import { usePathname } from "next/navigation";

import { VeroxHeader, type VeroxNavKey } from "@/components/abj/VeroxHeader";
import { LOCALE_CS, type VeroxLocale } from "@/lib/i18n/config";

// Globální lišta pro subpages. Landing /live má vlastní hlavičku uvnitř
// HomePage (stejná komponenta VeroxHeader), takže tam globální lišta ustoupí.
// Lišta i obsah subpage sdílí kontejner .hf-chrome (stejná šířka jako .hf).

function activeKeyFor(pathname: string): VeroxNavKey | undefined {
  const normalizedPathname = normalizeEnglishPath(pathname);
  if (normalizedPathname.startsWith("/noviny")) {
    return "noviny";
  }
  if (normalizedPathname.startsWith("/kanaly")) {
    return "kanaly";
  }
  if (normalizedPathname.startsWith("/nazory")) {
    return "nazory";
  }
  if (normalizedPathname.startsWith("/videa") || normalizedPathname.startsWith("/archiv") || normalizedPathname.startsWith("/feed")) {
    return "videa";
  }
  if (normalizedPathname.startsWith("/muj-verox") || normalizedPathname.startsWith("/komunita") || normalizedPathname.startsWith("/zed")) {
    return "muj";
  }
  return "zive";
}

function normalizeEnglishPath(pathname: string): string {
  if (pathname === "/en") return "/live";
  return pathname.replace(/^\/en(?=\/|$)/, "") || pathname;
}

export function ABJNav({ locale = LOCALE_CS }: { locale?: VeroxLocale }) {
  const pathname = usePathname();
  const normalizedPathname = normalizeEnglishPath(pathname);

  if (normalizedPathname.startsWith("/live") || /^\/videa\/[^/]+/.test(normalizedPathname)) {
    return null;
  }

  const nazoryChrome = normalizedPathname.startsWith("/nazory");

  return (
    <div className={`hf-chrome${nazoryChrome ? " nazory-chrome" : ""}`}>
      <VeroxHeader active={activeKeyFor(pathname)} locale={locale} />
      <div className={`double-rule header-rule${nazoryChrome ? " nazory-double-rule" : ""}`} aria-hidden="true" />
    </div>
  );
}

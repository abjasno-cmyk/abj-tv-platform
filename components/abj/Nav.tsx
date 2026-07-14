"use client";

import { usePathname } from "next/navigation";

import { VeroxHeader, type VeroxNavKey } from "@/components/abj/VeroxHeader";
import { LOCALE_CS, type VeroxLocale } from "@/lib/i18n/config";

// Globální lišta pro subpages. Landing /live má vlastní hlavičku uvnitř
// HomePage (stejná komponenta VeroxHeader), takže tam globální lišta ustoupí.
// Lišta i obsah subpage sdílí kontejner .hf-chrome (stejná šířka jako .hf).

function activeKeyFor(pathname: string): VeroxNavKey | undefined {
  if (pathname.startsWith("/noviny")) {
    return "noviny";
  }
  if (pathname.startsWith("/kanaly")) {
    return "kanaly";
  }
  if (pathname.startsWith("/nazory")) {
    return "nazory";
  }
  if (pathname.startsWith("/videa") || pathname.startsWith("/archiv") || pathname.startsWith("/feed")) {
    return "videa";
  }
  if (pathname.startsWith("/muj-verox") || pathname.startsWith("/komunita") || pathname.startsWith("/zed")) {
    return "muj";
  }
  return "zive";
}

export function ABJNav({ locale = LOCALE_CS }: { locale?: VeroxLocale }) {
  const pathname = usePathname();

  if (pathname.startsWith("/live") || /^\/videa\/[^/]+/.test(pathname)) {
    return null;
  }

  const nazoryChrome = pathname.startsWith("/nazory");

  return (
    <div className={`hf-chrome${nazoryChrome ? " nazory-chrome" : ""}`}>
      <VeroxHeader active={activeKeyFor(pathname)} locale={locale} />
      <div className={`double-rule header-rule${nazoryChrome ? " nazory-double-rule" : ""}`} aria-hidden="true" />
    </div>
  );
}

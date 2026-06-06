"use client";

import { usePathname } from "next/navigation";

import { VeroxHeader, type VeroxNavKey } from "@/components/abj/VeroxHeader";

// Globální lišta pro subpages. Landing /live má vlastní hlavičku uvnitř
// HomePage (stejná komponenta VeroxHeader), takže tam globální lišta ustoupí.
// Lišta i obsah subpage sdílí kontejner .hf-chrome (stejná šířka jako .hf).

function activeKeyFor(pathname: string): VeroxNavKey | undefined {
  if (pathname.startsWith("/nazory")) {
    // Názory zatím nejsou v menu — přístup přímo přes URL.
    return undefined;
  }
  if (pathname.startsWith("/videa") || pathname.startsWith("/archiv") || pathname.startsWith("/feed")) {
    return "videa";
  }
  if (pathname.startsWith("/v-kostce") || pathname.startsWith("/abj-x")) {
    return "kostce";
  }
  if (pathname.startsWith("/muj-verox") || pathname.startsWith("/komunita") || pathname.startsWith("/zed")) {
    return "muj";
  }
  return "zive";
}

export function ABJNav() {
  const pathname = usePathname();

  if (pathname.startsWith("/live")) {
    return null;
  }

  return (
    <div className="hf-chrome">
      <VeroxHeader active={activeKeyFor(pathname)} />
      <div className="double-rule header-rule" aria-hidden="true" />
    </div>
  );
}

"use client";

import { usePathname } from "next/navigation";

type AppChromeProps = { children: React.ReactNode };

// Renders global page chrome (legal footer, dev panels) everywhere EXCEPT the
// self-contained /design-system showcase, which ships its own footer. The
// children are server-rendered and merely gated here, so live routes are
// byte-for-byte unchanged.
export function AppChrome({ children }: AppChromeProps) {
  const pathname = usePathname();
  if (pathname?.startsWith("/design-system")) {
    return null;
  }
  return <>{children}</>;
}

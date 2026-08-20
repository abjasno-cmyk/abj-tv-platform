import type { Metadata } from "next";

import { LaunchCountdown } from "@/components/proudx/LaunchCountdown";

// Cíl rewrite brány z proxy: dokud čas < NEXT_PUBLIC_LAUNCH_AT, servíruje se
// místo všech stránek tento veřejný odpočet. Dočasná stránka — neindexovat.
export const metadata: Metadata = {
  title: "ProudX • Startujeme",
  description: "Nová internetová televize ProudX startuje dnes v 15:00.",
  robots: { index: false, follow: false },
};

export default function LaunchPage() {
  return <LaunchCountdown />;
}

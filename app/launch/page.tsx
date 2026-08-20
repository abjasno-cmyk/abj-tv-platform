import type { Metadata } from "next";

import { LaunchCountdown } from "@/components/proudx/LaunchCountdown";

// Cíl rewrite brány z proxy: dokud čas < NEXT_PUBLIC_LAUNCH_AT, servíruje se
// místo všech stránek tento veřejný odpočet. Dočasná stránka — neindexovat.
// Pojistka proti Full Route Cache — countdown se nikdy nesmí servírovat stale.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ProudX • Startujeme",
  description: "Nová internetová televize ProudX startuje dnes v 15:00.",
  robots: { index: false, follow: false },
};

export default function LaunchPage() {
  return <LaunchCountdown />;
}

import type { Metadata } from "next";

import { ArchivClient, type ArchivViewData } from "@/app/archiv/ArchivClient";

export const dynamic = "force-dynamic";

// Sirotčí stránka s AI tldr bez označení (AI Act čl. 50(4)) — neindexovat.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function DayOverviewPage() {
  const initialData: ArchivViewData = {
    topForDisplay: [],
    channels: [],
  };
  return <ArchivClient initialData={initialData} />;
}

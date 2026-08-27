import type { Metadata } from "next";

import { VKostceList } from "@/components/abj/VKostceList";

export const dynamic = "force-dynamic";

// AI shrnutí bez označení + bez navigace z webu (AI Act čl. 50(4)) — neindexovat.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// V KOSTCE = editoriální AI shrnutí (čerstvý feed přes useFeed). Karty .kostka
// dle návrhu „v_kostce_sirka" renderuje klientská komponenta VKostceList.
export default function VKostcePage() {
  return (
    <div className="vx-live vx-sub">
      <h1 className="section-h">V KOSTCE</h1>
      <VKostceList />
    </div>
  );
}

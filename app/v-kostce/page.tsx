import { VKostceList } from "@/components/abj/VKostceList";

export const dynamic = "force-dynamic";

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

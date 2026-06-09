import { KanalyPageClient } from "@/components/kanaly/KanalyPageClient";
import { loadLiveChannelsForPage } from "@/lib/liveChannelsServer";

export const dynamic = "force-dynamic";

export default async function KanalyPage() {
  const channels = await loadLiveChannelsForPage();

  return (
    <div className="vx-live vx-sub kanaly-sub">
      <h1 className="section-h">KANÁLY</h1>
      <KanalyPageClient channels={channels} />
    </div>
  );
}

import type { Metadata } from "next";

import { KanalyPageClient } from "@/components/kanaly/KanalyPageClient";
import { loadChannelSlugByNameMap } from "@/lib/seo/channelPageData";
import { loadLiveChannelsForPage } from "@/lib/liveChannelsServer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Kanály | Verox",
  description:
    "Přehled českých a slovenských kanálů na Verox.cz. Sledujte nová videa, rozhovory a komentáře na jednom místě.",
};

export default async function KanalyPage() {
  const [channels, slugByChannelName] = await Promise.all([
    loadLiveChannelsForPage(),
    loadChannelSlugByNameMap(),
  ]);

  return (
    <div className="vx-live vx-sub kanaly-sub">
      <h1 className="section-h">KANÁLY</h1>
      <KanalyPageClient channels={channels} slugByChannelName={Object.fromEntries(slugByChannelName)} />
    </div>
  );
}

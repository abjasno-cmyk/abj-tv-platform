import { KanalyPageClient } from "@/components/kanaly/KanalyPageClient";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getRequestLocale } from "@/lib/i18n/server";
import { loadLiveChannelsForPage } from "@/lib/liveChannelsServer";

export const dynamic = "force-dynamic";

export default async function KanalyPage() {
  const [channels, locale] = await Promise.all([loadLiveChannelsForPage(), getRequestLocale()]);
  const dictionary = getDictionary(locale);

  return (
    <div className="vx-live vx-sub kanaly-sub">
      <h1 className="section-h">{dictionary.channels.title}</h1>
      <KanalyPageClient channels={channels} />
    </div>
  );
}

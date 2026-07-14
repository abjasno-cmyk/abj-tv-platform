import { VideaVideoList } from "@/components/viewer/VideaVideoList";
import { loadStructuredFeedPayload, type FeedVideo } from "@/lib/dayOverview";
import { getRequestLocale } from "@/lib/i18n/server";
import { localizeFeedVideos } from "@/lib/i18n/videoTitles";

export const dynamic = "force-dynamic";

async function loadVideos(): Promise<FeedVideo[]> {
  try {
    const payload = await loadStructuredFeedPayload();
    const videos = payload.top.length > 0 ? payload.top : Object.values(payload.channels).flat();
    return videos.slice(0, 30);
  } catch {
    return [];
  }
}

// Nejnovější videa — karta = datum (měsíc + velký den) + náhled + popis.
export default async function VideaPage() {
  const [videos, locale] = await Promise.all([loadVideos(), getRequestLocale()]);
  const displayVideos = await localizeFeedVideos(videos, locale);

  return (
    <div className="vx-live vx-sub">
      <h1 className="section-h">{locale === "en" ? "Latest releases" : "Právě vyšlo"}</h1>
      {videos.length === 0 ? (
        <div className="mv">
          <div className="info">{locale === "en" ? "Videos are being prepared." : "Videa se právě připravují."}</div>
        </div>
      ) : (
        <VideaVideoList videos={displayVideos} />
      )}
    </div>
  );
}

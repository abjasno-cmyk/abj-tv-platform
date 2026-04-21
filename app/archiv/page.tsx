import { VideoCard } from "@/components/abj/VideoCard";
import { VideoEditorial } from "@/components/abj/VideoEditorial";
import {
  deduplicateVideos,
  deduplicateBySeen,
  groupChannelsForDisplay,
  loadStructuredFeedPayload,
  type FeedVideo,
  type FeedResponse,
} from "@/lib/dayOverview";
import type { FeedEditorial } from "@/lib/dayOverview";

export const dynamic = "force-dynamic";

const EMPTY_MESSAGE = "Zatím žádná nová videa";

function buildEditorial(video: FeedVideo): FeedEditorial | null {
  const tldr = video.tldr?.trim();
  if (!tldr) return null;
  return {
    tldr,
    context: video.context?.trim() || undefined,
    impact: video.impact?.trim() || undefined,
    freshness: video.freshness,
  };
}

async function loadStructuredFeed(): Promise<FeedResponse | null> {
  try {
    return await loadStructuredFeedPayload();
  } catch (error) {
    console.error("Failed to load structured feed", error);
    return null;
  }
}

export default async function DayOverviewPage() {
  const payload = await loadStructuredFeed();
  const top = payload ? deduplicateVideos(payload.top).slice(0, 10) : [];
  const seenAcrossSections = new Set<string>();
  const topForDisplay = top.filter((video) => deduplicateBySeen(video, seenAcrossSections));

  const channels = payload
    ? groupChannelsForDisplay(payload.channels)
        .map((entry) => ({
          ...entry,
          videos: entry.videos.filter((video) => deduplicateBySeen(video, seenAcrossSections)),
        }))
        .filter((entry) => entry.videos.length > 0)
    : [];

  const hasAnyContent = topForDisplay.length > 0 || channels.length > 0;

  return (
    <section className="space-y-12 py-6">
      <header className="space-y-2">
        <p className="text-[11px] uppercase tracking-[0.14em] text-abj-text2">Výběr dne</p>
        <h1 className="font-[var(--font-serif)] text-3xl font-semibold text-abj-text1">Co právě přibylo</h1>
        <p className="text-sm text-abj-text2">Co právě vyšlo v ABJ síti</p>
      </header>

      {!hasAnyContent ? (
        <div className="rounded-xl border border-[var(--abj-gold-dim)] bg-abj-panel p-6 text-sm text-abj-text2">
          {EMPTY_MESSAGE}
        </div>
      ) : null}

      {topForDisplay.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-abj-text1">Hlavní výběr</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {topForDisplay.map((video) => (
              <div key={`${video.video_id}-${video.channel}`} className="space-y-2">
                <VideoCard
                  videoId={video.video_id}
                  thumbnail={video.thumbnail}
                  title={video.title}
                  channel={video.channel}
                  publishedAt={video.published_at}
                  featured={true}
                />
                {buildEditorial(video) ? (
                  <VideoEditorial videoId={video.video_id} {...buildEditorial(video)!} />
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {channels.length > 0 ? (
        <section className="space-y-5">
          <h2 className="text-lg font-semibold text-abj-text1">Podle kanálů</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {channels.map((entry) => {
              const sectionId = `channel-${entry.channel.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
              return (
                <a
                  key={`tile-${entry.channel}`}
                  href={`#${sectionId}`}
                  className="rounded-xl border border-[var(--abj-gold-dim)] bg-abj-panel px-3 py-2 transition-colors hover:bg-abj-card"
                >
                  <p className="truncate text-sm font-semibold uppercase tracking-[0.05em] text-abj-gold">
                    {entry.channel}
                  </p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.08em] text-abj-text2">
                    {entry.videos.length} videí
                  </p>
                </a>
              );
            })}
          </div>
          <div className="space-y-8">
            {channels.map((entry) => (
              <section
                key={entry.channel}
                id={`channel-${entry.channel.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                className="space-y-3 scroll-mt-20"
              >
                <div className="inline-flex rounded-lg border border-[var(--abj-gold-dim)] bg-abj-panel px-3 py-1.5">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-abj-gold">
                    {entry.channel}
                  </h3>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {entry.videos.slice(0, 6).map((video) => (
                    <div key={`${entry.channel}-${video.video_id}-${video.channel}`} className="space-y-2">
                      <VideoCard
                        videoId={video.video_id}
                        thumbnail={video.thumbnail}
                        title={video.title}
                        channel={video.channel}
                        publishedAt={video.published_at}
                      />
                      {buildEditorial(video) ? (
                        <VideoEditorial videoId={video.video_id} {...buildEditorial(video)!} />
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}

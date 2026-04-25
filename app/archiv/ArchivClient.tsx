"use client";

import { useMemo } from "react";

import { VideoCard } from "@/components/abj/VideoCard";
import { VideoEditorial } from "@/components/abj/VideoEditorial";
import { HeroCard } from "@/components/archiv/HeroCard";
import { useFeed } from "@/hooks/useFeed";
import type { FeedPost } from "@/lib/api";

const EMPTY_MESSAGE = "Zatím žádná nová videa";

export type ArchivViewData = {
  topForDisplay: FeedVideoView[];
  channels: Array<{ channel: string; videos: FeedVideoView[] }>;
};

type FeedVideoView = {
  video_id: string;
  title: string;
  channel: string;
  published_at: string;
  topics: string[];
  thumbnail: string;
  tldr?: string;
  context?: string;
  impact?: string;
  freshness: "breaking" | "today" | "week" | "evergreen";
};

type FeedResponseView = {
  top: FeedVideoView[];
  channels: Record<string, FeedVideoView[]>;
};

type FeedEditorial = {
  tldr: string;
  context?: string;
  impact?: string;
  freshness: FeedVideoView["freshness"];
};

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function deduplicateVideos(videos: FeedVideoView[]): FeedVideoView[] {
  const seenVideoIds = new Set<string>();
  const seenTitleChannel = new Set<string>();
  const deduped: FeedVideoView[] = [];

  for (const video of videos) {
    const videoIdKey = video.video_id.trim();
    const titleChannelKey = `${normalizeText(video.title)}|${normalizeText(video.channel)}`;
    if (videoIdKey && seenVideoIds.has(videoIdKey)) continue;
    if (seenTitleChannel.has(titleChannelKey)) continue;

    if (videoIdKey) seenVideoIds.add(videoIdKey);
    seenTitleChannel.add(titleChannelKey);
    deduped.push(video);
  }

  return deduped;
}

function parseTimestamp(value: string | null | undefined): number {
  if (!value) return 0;
  const ts = new Date(value).getTime();
  return Number.isFinite(ts) ? ts : 0;
}

function sortNewest(videos: FeedVideoView[]): FeedVideoView[] {
  return [...videos].sort((a, b) => parseTimestamp(b.published_at) - parseTimestamp(a.published_at));
}

function videoUniqKey(video: FeedVideoView): string {
  const idKey = video.video_id.trim();
  if (idKey) return idKey;
  return `${normalizeText(video.title)}|${normalizeText(video.channel)}`;
}

function deduplicateBySeen(video: FeedVideoView, seen: Set<string>): boolean {
  const key = videoUniqKey(video);
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
}

function groupChannelsForDisplay(
  channels: Record<string, FeedVideoView[]>,
  limit: number = 8
): Array<{ channel: string; videos: FeedVideoView[] }> {
  return Object.entries(channels)
    .map(([channel, items]) => ({
      channel,
      videos: sortNewest(deduplicateVideos(items)),
    }))
    .sort((a, b) => b.videos.length - a.videos.length)
    .slice(0, limit);
}

function mapPostToFeedVideo(post: FeedPost): FeedVideoView {
  return {
    video_id: post.video_id,
    title: post.headline?.trim() || post.what?.trim() || "Bez titulku",
    channel: post.channel_name || "Neznámý kanál",
    published_at: post.video_published_at ?? post.created_at,
    topics: post.tags ?? [],
    thumbnail: `https://i.ytimg.com/vi/${encodeURIComponent(post.video_id)}/hqdefault.jpg`,
    tldr: post.what,
    context: post.why ?? undefined,
    impact: post.impact ?? undefined,
    freshness: post.freshness,
  };
}

function buildEditorial(video: FeedVideoView): FeedEditorial | null {
  const tldr = video.tldr?.trim();
  if (!tldr) return null;
  return {
    tldr,
    context: video.context?.trim() || undefined,
    impact: video.impact?.trim() || undefined,
    freshness: video.freshness,
  };
}

type ArchivClientProps = {
  initialData: ArchivViewData;
};

function mergePayload(current: FeedResponseView, incoming: FeedResponseView): FeedResponseView {
  const mergedTop = sortNewest(deduplicateVideos([...incoming.top, ...current.top]));
  const mergedChannels: Record<string, FeedVideoView[]> = { ...current.channels };

  for (const [channel, videos] of Object.entries(incoming.channels)) {
    mergedChannels[channel] = sortNewest(deduplicateVideos([...(mergedChannels[channel] ?? []), ...videos]));
  }

  return {
    ...current,
    top: mergedTop,
    channels: mergedChannels,
  };
}

function buildViewData(payload: FeedResponseView | null): ArchivViewData {
  const top = payload ? deduplicateVideos(payload.top).slice(0, 10) : [];
  const seenAcrossSections = new Set<string>();
  const topForDisplay = top.filter((video) => deduplicateBySeen(video, seenAcrossSections));

  const channels = payload
    ? groupChannelsForDisplay(payload.channels, 8)
        .map((entry) => ({
          ...entry,
          videos: entry.videos.filter((video) => deduplicateBySeen(video, seenAcrossSections)),
        }))
        .filter((entry) => entry.videos.length > 0)
    : [];

  return { topForDisplay, channels };
}

export function ArchivClient({ initialData }: ArchivClientProps) {
  const { posts, loading, hasMore, loadMore } = useFeed();

  const currentPayload = useMemo<FeedResponseView>(
    () => ({
      top: initialData.topForDisplay,
      channels: Object.fromEntries(initialData.channels.map((entry) => [entry.channel, entry.videos])),
    }),
    [initialData]
  );

  const incomingPayload = useMemo<FeedResponseView>(() => {
    if (posts.length === 0) {
      return { top: [], channels: {} };
    }

    const mapped = posts.map(mapPostToFeedVideo);
    return {
      top: deduplicateVideos(mapped),
      channels: mapped.reduce<Record<string, FeedVideoView[]>>((acc, video) => {
        const key = video.channel || "Neznámý kanál";
        if (!acc[key]) acc[key] = [];
        acc[key].push(video);
        return acc;
      }, {}),
    };
  }, [posts]);

  const { topForDisplay, channels } = useMemo(() => {
    const merged = mergePayload(currentPayload, incomingPayload);
    return buildViewData(merged);
  }, [currentPayload, incomingPayload]);

  const hasAnyContent = topForDisplay.length > 0 || channels.length > 0;
  const hero = topForDisplay[0] ?? null;
  const heroInsight =
    hero?.context?.trim() ||
    hero?.impact?.trim() ||
    hero?.tldr?.trim() ||
    "Sleduj hlavní téma dne a kontextové souvislosti napříč kanály.";

  return (
    <section className="space-y-12 py-6">
      <header className="space-y-2">
        <p className="text-[11px] uppercase tracking-[0.14em] text-abj-text2">Výběr dne</p>
        <h1 className="font-[var(--font-serif)] text-3xl font-semibold text-abj-text1">Co právě přibylo</h1>
        <p className="text-sm text-abj-text2">Co právě vyšlo v ABJ síti</p>
      </header>

      {!hasAnyContent && !loading ? (
        <div className="rounded-xl border border-[var(--abj-gold-dim)] bg-abj-panel p-6 text-sm text-abj-text2">
          {EMPTY_MESSAGE}
        </div>
      ) : null}

      {topForDisplay.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-abj-text1">Hlavní výběr</h2>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {hero ? (
              <div className="lg:col-span-2">
                <HeroCard
                  title={hero.title}
                  channel={hero.channel}
                  publishedAt={hero.published_at}
                  thumbnail={hero.thumbnail}
                  insight={heroInsight}
                  href={`/live?videoId=${encodeURIComponent(hero.video_id)}`}
                />
              </div>
            ) : null}
            <div className="space-y-4">
              {(hero ? topForDisplay.slice(1) : topForDisplay).slice(0, 3).map((video) => (
                <div key={`${video.video_id}-${video.channel}`} className="space-y-2">
                  <VideoCard
                    videoId={video.video_id}
                    thumbnail={video.thumbnail}
                    title={video.title}
                    channel={video.channel}
                    publishedAt={video.published_at}
                    featured={false}
                  />
                  {buildEditorial(video) ? (
                    <VideoEditorial videoId={video.video_id} {...buildEditorial(video)!} />
                  ) : null}
                </div>
              ))}
            </div>
            {topForDisplay.slice(hero ? 4 : 3).map((video) => (
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

      {hasMore ? (
        <div className="flex justify-center">
          <button
            type="button"
            className="rounded-lg border border-[var(--abj-gold-dim)] bg-abj-panel px-4 py-2 text-xs uppercase tracking-[0.08em] text-abj-text2 hover:text-abj-text1"
            onClick={() => {
              void loadMore();
            }}
          >
            {loading ? "Načítám..." : "Načíst další"}
          </button>
        </div>
      ) : null}
    </section>
  );
}

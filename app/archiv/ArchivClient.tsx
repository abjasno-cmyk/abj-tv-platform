"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import { useFeed } from "@/hooks/useFeed";
import type { FeedPost } from "@/lib/api";

const EMPTY_MESSAGE = "Zatím nejsou dostupná žádná nová videa.";
const CHANNEL_LIMIT = 12;
const LATEST_VIDEO_LIMIT = 16;
const FILTERED_VIDEO_LIMIT = 12;

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

function formatPublishedLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("cs-CZ", {
    timeZone: "Europe/Prague",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
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

function isAbjChannel(channelName: string): boolean {
  const normalized = normalizeText(channelName);
  return normalized.includes("abj") || normalized.includes("aby bylo jasno");
}

function makeChannelSlug(channel: string): string {
  return channel.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function groupChannelsForDisplay(
  channels: Record<string, FeedVideoView[]>,
  limit: number = CHANNEL_LIMIT
): Array<{ channel: string; videos: FeedVideoView[] }> {
  return Object.entries(channels)
    .map(([channel, items]) => ({
      channel,
      videos: sortNewest(deduplicateVideos(items)),
    }))
    .filter((entry) => entry.videos.length > 0)
    .sort((a, b) => {
      const aAbj = isAbjChannel(a.channel);
      const bAbj = isAbjChannel(b.channel);
      if (aAbj !== bAbj) return aAbj ? -1 : 1;

      if (b.videos.length !== a.videos.length) return b.videos.length - a.videos.length;

      const newestA = parseTimestamp(a.videos[0]?.published_at);
      const newestB = parseTimestamp(b.videos[0]?.published_at);
      return newestB - newestA;
    })
    .slice(0, limit);
}

function mapPostToFeedVideo(post: FeedPost): FeedVideoView {
  return {
    video_id: post.video_id,
    title: post.headline?.trim() || post.what?.trim() || "Bez titulku",
    channel: post.channel_name || "Neznámý kanál",
    published_at: post.video_published_at ?? post.created_at,
    topics: post.tags ?? [],
    thumbnail: post.video_id
      ? `https://i.ytimg.com/vi/${encodeURIComponent(post.video_id)}/hqdefault.jpg`
      : "/placeholder-thumb.jpg",
    tldr: post.what,
    context: post.why ?? undefined,
    impact: post.impact ?? undefined,
    freshness: post.freshness,
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

type ArchiveVideoCardProps = {
  video: FeedVideoView;
  variant?: "hero" | "featured" | "compact";
  tag?: string;
  accent?: boolean;
};

function ArchiveVideoCard({ video, variant = "compact", tag, accent = false }: ArchiveVideoCardProps) {
  const href = `/live?videoId=${encodeURIComponent(video.video_id)}`;
  const publishedLabel = formatPublishedLabel(video.published_at);
  const thumbnailSrc = video.thumbnail?.trim() ? video.thumbnail : "/placeholder-thumb.jpg";
  const isHero = variant === "hero";
  const isFeatured = variant === "featured";

  return (
    <Link
      href={href}
      className={`group block overflow-hidden rounded-2xl border bg-white transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A00]/60 ${
        accent
          ? "border-[#FF6A00]/35 shadow-[0_8px_24px_rgba(255,106,0,0.12)] hover:border-[#FF6A00]/55"
          : "border-[var(--abj-gold-dim)] shadow-[0_8px_22px_rgba(17,17,17,0.08)] hover:border-[rgba(17,17,17,0.28)]"
      } hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(17,17,17,0.12)]`}
    >
      <div className="relative aspect-video overflow-hidden bg-[#F2F2F2]">
        <Image
          src={thumbnailSrc}
          alt={video.title}
          fill
          loading="lazy"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          sizes={
            isHero
              ? "(max-width: 1024px) 100vw, 66vw"
              : isFeatured
                ? "(max-width: 1024px) 100vw, 33vw"
                : "(max-width: 768px) 100vw, (max-width: 1400px) 33vw, 25vw"
          }
          unoptimized={Boolean(video.thumbnail)}
        />
        {tag ? (
          <span className="absolute left-2 top-2 rounded-full border border-[#FF6A00]/35 bg-white/95 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#C14900]">
            {tag}
          </span>
        ) : null}
        {isHero ? (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/45 to-transparent px-3 pb-3 pt-10 text-white">
            <p className="line-clamp-2 font-[var(--font-serif)] text-[22px] leading-tight">{video.title}</p>
            <p className="mt-2 text-xs text-white/85">
              {video.channel}
              {publishedLabel ? ` · ${publishedLabel}` : ""}
            </p>
          </div>
        ) : null}
      </div>

      {!isHero ? (
        <div className={`${isFeatured ? "space-y-1.5 p-3.5" : "space-y-1 p-3"}`}>
          <p
            className={`line-clamp-2 text-abj-text1 ${isFeatured ? "text-[15px] font-semibold leading-snug" : "text-sm font-medium"}`}
          >
            {video.title}
          </p>
          <p className="truncate text-xs font-medium text-abj-text2">{video.channel}</p>
          {publishedLabel ? <p className="text-[11px] text-abj-text3">{publishedLabel}</p> : null}
        </div>
      ) : null}
    </Link>
  );
}

function VideoCardSkeleton({ variant = "compact" }: { variant?: "hero" | "featured" | "compact" }) {
  const isHero = variant === "hero";
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl border border-[var(--abj-gold-dim)] bg-white">
      <div className="aspect-video bg-[rgba(17,17,17,0.08)]" />
      {!isHero ? (
        <div className="space-y-2 p-3">
          <div className="h-4 w-[85%] rounded bg-[rgba(17,17,17,0.1)]" />
          <div className="h-4 w-[65%] rounded bg-[rgba(17,17,17,0.08)]" />
          <div className="h-3 w-24 rounded bg-[rgba(17,17,17,0.08)]" />
        </div>
      ) : null}
    </div>
  );
}

type FeaturedAbjSectionProps = {
  primary: FeedVideoView | null;
  secondary: FeedVideoView[];
  loading: boolean;
};

function FeaturedAbjSection({ primary, secondary, loading }: FeaturedAbjSectionProps) {
  if (!primary && !loading) return null;

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-abj-text1">Doporučujeme z ABJ</h2>
        <p className="text-sm text-abj-text2">Rychlý výběr nejčerstvějších pořadů s preferencí hlavního kanálu ABJ.</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <div>
          {primary ? (
            <ArchiveVideoCard
              video={primary}
              variant="hero"
              tag={isAbjChannel(primary.channel) ? "ABJ výběr" : "Hlavní doporučení"}
              accent={isAbjChannel(primary.channel)}
            />
          ) : (
            <VideoCardSkeleton variant="hero" />
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
          {secondary.length > 0
            ? secondary.map((video) => (
                <ArchiveVideoCard
                  key={`featured-${videoUniqKey(video)}`}
                  video={video}
                  variant="featured"
                  accent={isAbjChannel(video.channel)}
                  tag={isAbjChannel(video.channel) ? "ABJ" : undefined}
                />
              ))
            : loading
              ? [0, 1, 2].map((slot) => <VideoCardSkeleton key={`featured-skeleton-${slot}`} variant="featured" />)
              : null}
        </div>
      </div>
    </section>
  );
}

type ChannelTilesProps = {
  channels: Array<{ channel: string; videos: FeedVideoView[] }>;
  selectedChannel: string | null;
  onSelect: (channel: string) => void;
  loading: boolean;
};

function ChannelTiles({ channels, selectedChannel, onSelect, loading }: ChannelTilesProps) {
  if (channels.length === 0 && !loading) return null;

  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-abj-text1">Kanály</h2>
        <p className="text-sm text-abj-text2">Vyberte kanál pro rychlý přehled nově publikovaných videí.</p>
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        {channels.length > 0
          ? channels.map((entry) => {
              const active = selectedChannel === entry.channel;
              const isAbj = isAbjChannel(entry.channel);
              const newestLabel = formatPublishedLabel(entry.videos[0]?.published_at);
              const initial = entry.channel.trim().charAt(0).toUpperCase() || "•";

              return (
                <button
                  key={`channel-tile-${makeChannelSlug(entry.channel)}`}
                  type="button"
                  onClick={() => onSelect(entry.channel)}
                  className={`min-w-[190px] rounded-xl border px-3 py-2 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A00]/60 sm:min-w-0 ${
                    active
                      ? "border-[#FF6A00]/55 bg-[rgba(255,106,0,0.08)] shadow-[0_8px_20px_rgba(255,106,0,0.12)]"
                      : isAbj
                        ? "border-[#FF6A00]/30 bg-white hover:border-[#FF6A00]/50"
                        : "border-[var(--abj-gold-dim)] bg-white hover:border-[rgba(17,17,17,0.28)]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span
                        className={`inline-flex h-7 w-7 flex-none items-center justify-center rounded-full text-xs font-semibold ${
                          isAbj ? "bg-[#FF6A00]/14 text-[#C14900]" : "bg-[rgba(17,17,17,0.08)] text-abj-text2"
                        }`}
                      >
                        {initial}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-abj-text1">{entry.channel}</p>
                        <p className="text-[11px] uppercase tracking-[0.08em] text-abj-text2">{entry.videos.length} videí</p>
                      </div>
                    </div>
                    {isAbj ? (
                      <span className="rounded-full bg-[#FF6A00]/14 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#C14900]">
                        Hlavní kanál
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-[11px] text-abj-text3">{newestLabel ? `Poslední: ${newestLabel}` : "Nově přidáno"}</p>
                </button>
              );
            })
          : [0, 1, 2, 3].map((slot) => (
              <div
                key={`channel-skeleton-${slot}`}
                className="min-w-[190px] animate-pulse rounded-xl border border-[var(--abj-gold-dim)] bg-white p-3 sm:min-w-0"
              >
                <div className="mb-2 h-4 w-28 rounded bg-[rgba(17,17,17,0.1)]" />
                <div className="h-3 w-20 rounded bg-[rgba(17,17,17,0.08)]" />
              </div>
            ))}
      </div>
    </section>
  );
}

type VideoGridProps = {
  title: string;
  subtitle: string;
  videos: FeedVideoView[];
  loading: boolean;
  emptyMessage: string;
};

function VideoGrid({ title, subtitle, videos, loading, emptyMessage }: VideoGridProps) {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-abj-text1">{title}</h2>
        <p className="text-sm text-abj-text2">{subtitle}</p>
      </div>

      {videos.length === 0 && !loading ? (
        <div className="rounded-xl border border-[var(--abj-gold-dim)] bg-white p-5 text-sm text-abj-text2">{emptyMessage}</div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {videos.length > 0
            ? videos.map((video) => (
                <ArchiveVideoCard key={`grid-${videoUniqKey(video)}`} video={video} variant="compact" accent={isAbjChannel(video.channel)} />
              ))
            : [0, 1, 2, 3, 4, 5, 6, 7].map((slot) => <VideoCardSkeleton key={`grid-skeleton-${slot}`} />)}
        </div>
      )}
    </section>
  );
}

type ChannelFilteredSectionProps = {
  selectedChannel: string | null;
  videos: FeedVideoView[];
  loading: boolean;
};

function ChannelFilteredSection({ selectedChannel, videos, loading }: ChannelFilteredSectionProps) {
  if (!selectedChannel && !loading) return null;

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-abj-text1">Podle kanálu</h2>
        <p className="text-sm text-abj-text2">
          {selectedChannel ? `Aktuálně vybraný kanál: ${selectedChannel}` : "Vyberte kanál pro filtrovaný výpis."}
        </p>
      </div>

      {videos.length === 0 && !loading ? (
        <div className="rounded-xl border border-[var(--abj-gold-dim)] bg-white p-5 text-sm text-abj-text2">
          Pro vybraný kanál zatím nejsou novější videa.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {videos.length > 0
            ? videos.map((video) => (
                <ArchiveVideoCard key={`channel-grid-${videoUniqKey(video)}`} video={video} variant="compact" accent={isAbjChannel(video.channel)} />
              ))
            : [0, 1, 2, 3].map((slot) => <VideoCardSkeleton key={`channel-grid-skeleton-${slot}`} />)}
        </div>
      )}
    </section>
  );
}

export function ArchivClient({ initialData }: ArchivClientProps) {
  const { posts, loading, hasMore, loadMore } = useFeed();
  const [userSelectedChannel, setUserSelectedChannel] = useState<string | null>(null);

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

  const mergedPayload = useMemo(() => mergePayload(currentPayload, incomingPayload), [currentPayload, incomingPayload]);

  const allVideos = useMemo(() => sortNewest(deduplicateVideos(mergedPayload.top)), [mergedPayload.top]);
  const channels = useMemo(
    () => groupChannelsForDisplay(mergedPayload.channels, CHANNEL_LIMIT),
    [mergedPayload.channels]
  );
  const hasAnyContent = allVideos.length > 0;
  const isInitialLoading = loading && !hasAnyContent;

  const featuredSelection = useMemo(() => {
    if (allVideos.length === 0) {
      return { primary: null as FeedVideoView | null, secondary: [] as FeedVideoView[] };
    }

    const abjVideos = allVideos.filter((video) => isAbjChannel(video.channel));
    const primary = abjVideos[0] ?? allVideos[0];
    if (!primary) {
      return { primary: null as FeedVideoView | null, secondary: [] as FeedVideoView[] };
    }

    const seen = new Set<string>([videoUniqKey(primary)]);
    const orderedCandidates = [...abjVideos, ...allVideos];
    const secondary = orderedCandidates.filter((video) => deduplicateBySeen(video, seen)).slice(0, 4);

    return { primary, secondary };
  }, [allVideos]);

  const selectedChannel = useMemo(() => {
    if (channels.length === 0) return null;
    if (userSelectedChannel && channels.some((entry) => entry.channel === userSelectedChannel)) {
      return userSelectedChannel;
    }
    const preferred = channels.find((entry) => isAbjChannel(entry.channel));
    return preferred?.channel ?? channels[0].channel;
  }, [channels, userSelectedChannel]);

  const latestVideos = useMemo(() => allVideos.slice(0, LATEST_VIDEO_LIMIT), [allVideos]);

  const channelFilteredVideos = useMemo(() => {
    if (!selectedChannel) return [];
    const normalizedSelected = normalizeText(selectedChannel);
    return allVideos
      .filter((video) => normalizeText(video.channel) === normalizedSelected)
      .slice(0, FILTERED_VIDEO_LIMIT);
  }, [allVideos, selectedChannel]);

  const selectedChannelCount = useMemo(() => {
    if (!selectedChannel) return 0;
    return allVideos.filter((video) => normalizeText(video.channel) === normalizeText(selectedChannel)).length;
  }, [allVideos, selectedChannel]);

  return (
    <section className="mx-auto w-full max-w-[1280px] space-y-10 px-4 py-6 sm:px-6 lg:space-y-12">
      <header className="space-y-2">
        <p className="text-[11px] uppercase tracking-[0.16em] text-abj-text2">Nově ve vysílání</p>
        <h1 className="font-[var(--font-serif)] text-3xl font-semibold leading-tight text-abj-text1 sm:text-4xl">
          Nově ve vysílání
        </h1>
        <p className="max-w-3xl text-sm text-abj-text2 sm:text-base">
          Nejnovější videa, pořady a výběr z kanálů ABJ sítě.
        </p>
      </header>

      <FeaturedAbjSection
        primary={featuredSelection.primary}
        secondary={featuredSelection.secondary}
        loading={isInitialLoading}
      />

      <ChannelTiles
        channels={channels}
        selectedChannel={selectedChannel}
        onSelect={setUserSelectedChannel}
        loading={isInitialLoading}
      />

      <VideoGrid
        title="Nejnovější videa"
        subtitle="Kompaktní přehled napříč celou ABJ sítí."
        videos={latestVideos}
        loading={isInitialLoading}
        emptyMessage={EMPTY_MESSAGE}
      />

      <ChannelFilteredSection selectedChannel={selectedChannel} videos={channelFilteredVideos} loading={isInitialLoading} />

      {selectedChannel ? (
        <div className="rounded-xl border border-[var(--abj-gold-dim)] bg-white px-3 py-2 text-xs uppercase tracking-[0.08em] text-abj-text2">
          Kanál <span className="font-semibold text-abj-text1">{selectedChannel}</span> · {selectedChannelCount} videí
        </div>
      ) : null}

      {hasMore ? (
        <div className="flex justify-center">
          <button
            type="button"
            className="rounded-lg border border-[var(--abj-gold-dim)] bg-white px-4 py-2 text-xs uppercase tracking-[0.08em] text-abj-text2 transition hover:border-[#FF6A00]/45 hover:text-abj-text1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A00]/60"
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

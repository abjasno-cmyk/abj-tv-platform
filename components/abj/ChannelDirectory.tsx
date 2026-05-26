"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { FollowChannelButton } from "@/components/auth/FollowChannelButton";

export type LiveChannelVideo = {
  videoId: string;
  title: string;
  thumbnail: string | null;
  publishedAt: string;
};

export type LiveChannelGroup = {
  channelName: string;
  avatarUrl: string | null;
  channelId: string | null;
  channelUrl: string | null;
  videos: LiveChannelVideo[];
};

type ChannelDirectoryProps = {
  channels: LiveChannelGroup[];
  onSelectVideo: (payload: { channelName: string; video: LiveChannelVideo }) => void;
};

type ChannelLatestApiResponse = {
  videos?: Array<{
    videoId?: string;
    title?: string;
    thumbnail?: string;
    publishedAt?: string;
  }>;
  error?: string;
};

function normalizeForSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function isAbyByloJasno(channelName: string): boolean {
  return normalizeForSearch(channelName).includes("aby bylo jasno");
}

function formatPublishedLabel(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "Bez data";
  return new Intl.DateTimeFormat("cs-CZ", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function initialsFromName(channelName: string): string {
  const parts = channelName
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return "CH";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
}

function ChannelAvatar({ channelName, avatarUrl }: { channelName: string; avatarUrl: string | null }) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(avatarUrl) && !imageFailed;

  return (
    <span className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[rgba(17,17,17,0.14)] bg-[rgba(255,255,255,0.9)] shadow-[0_4px_10px_rgba(17,17,17,0.08)]">
      {showImage ? (
        <Image
          src={avatarUrl!}
          alt={`${channelName} avatar`}
          fill
          className="object-cover"
          onError={() => setImageFailed(true)}
          unoptimized
        />
      ) : (
        <span className="text-[11px] font-bold uppercase tracking-[0.05em] text-abj-text2">{initialsFromName(channelName)}</span>
      )}
    </span>
  );
}

export function ChannelDirectory({ channels, onSelectVideo }: ChannelDirectoryProps) {
  const [activeChannelName, setActiveChannelName] = useState<string | null>(null);
  const [fetchedVideosByChannel, setFetchedVideosByChannel] = useState<Record<string, LiveChannelVideo[]>>({});
  const [loadingByChannel, setLoadingByChannel] = useState<Record<string, boolean>>({});
  const [errorByChannel, setErrorByChannel] = useState<Record<string, string>>({});

  const orderedChannels = useMemo(
    () => [...channels].sort((a, b) => a.channelName.localeCompare(b.channelName, "cs-CZ")),
    [channels]
  );
  const resolvedActiveChannelName = activeChannelName ?? orderedChannels[0]?.channelName ?? null;
  const activeChannel = useMemo(
    () => orderedChannels.find((channel) => channel.channelName === resolvedActiveChannelName) ?? null,
    [orderedChannels, resolvedActiveChannelName]
  );

  const loadFallbackVideos = async (channel: LiveChannelGroup) => {
    const channelKey = channel.channelName;
    const channelId = channel.channelId;
    const channelUrl = channel.channelUrl;
    if (channel.videos.length > 0) return;
    if (!channelId && !channelUrl) return;
    if (loadingByChannel[channelKey]) return;
    if (Object.prototype.hasOwnProperty.call(fetchedVideosByChannel, channelKey)) return;

    setLoadingByChannel((prev) => ({ ...prev, [channelKey]: true }));
    setErrorByChannel((prev) => ({ ...prev, [channelKey]: "" }));

    try {
      const params = new URLSearchParams();
      if (channelId) params.set("channelId", channelId);
      if (channelUrl) params.set("channelUrl", channelUrl);
      params.set("channelName", channel.channelName);
      params.set("limit", "4");

      const response = await fetch(`/api/channel-latest?${params.toString()}`, {
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => ({}))) as ChannelLatestApiResponse;
      if (!response.ok) {
        throw new Error(payload.error ?? `HTTP ${response.status}`);
      }

      const fallbackVideos = (payload.videos ?? [])
        .map((video): LiveChannelVideo | null => {
          const videoId = video.videoId?.trim();
          const title = video.title?.trim();
          if (!videoId || !title) return null;
          return {
            videoId,
            title,
            thumbnail: video.thumbnail?.trim() || null,
            publishedAt: video.publishedAt?.trim() || new Date(0).toISOString(),
          };
        })
        .filter((video): video is LiveChannelVideo => Boolean(video));

      setFetchedVideosByChannel((prev) => ({ ...prev, [channelKey]: fallbackVideos }));
      if (fallbackVideos.length === 0) {
        setErrorByChannel((prev) => ({
          ...prev,
          [channelKey]: "Kanál momentálně neposkytuje dostupná videa.",
        }));
      }
    } catch (error) {
      setFetchedVideosByChannel((prev) => ({ ...prev, [channelKey]: [] }));
      setErrorByChannel((prev) => ({
        ...prev,
        [channelKey]: error instanceof Error ? error.message : "Nepodařilo se načíst videa.",
      }));
    } finally {
      setLoadingByChannel((prev) => ({ ...prev, [channelKey]: false }));
    }
  };

  return (
    <section className="rounded-[32px] border border-[rgba(17,17,17,0.1)] bg-white px-5 py-5 shadow-[0_16px_35px_rgba(17,17,17,0.08)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-black tracking-tight text-abj-text1">Kanály</h3>
          <p className="text-[11px] uppercase tracking-[0.16em] text-abj-text2">Vyberte kanál a spusťte videa</p>
        </div>
        <span className="rounded-full border border-[#ED742F]/35 bg-[rgba(237,116,47,0.1)] px-3 py-1 text-xs font-semibold text-[#A5491D]">
          {orderedChannels.length} kanálů
        </span>
      </div>

      <div className="space-y-4">
        {orderedChannels.length === 0 ? (
          <p className="rounded-2xl border border-[rgba(17,17,17,0.14)] bg-white px-4 py-3 text-sm text-abj-text2">
            Seznam kanálů se připravuje.
          </p>
        ) : (
          <>
            <div className="-mx-1 overflow-x-auto rounded-2xl border border-[rgba(17,17,17,0.1)] bg-[#FCFAF7] p-2">
              <div className="flex min-w-max gap-2">
                {orderedChannels.map((channel) => {
                  const selected = resolvedActiveChannelName === channel.channelName;
                  const featured = isAbyByloJasno(channel.channelName);
                  return (
                    <button
                      key={channel.channelName}
                      type="button"
                      onClick={() => {
                        setActiveChannelName(channel.channelName);
                        if (channel.videos.length === 0) {
                          void loadFallbackVideos(channel);
                        }
                      }}
                      className={`inline-flex min-h-12 items-center gap-2 rounded-full border px-3 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ED742F]/45 ${
                        selected
                          ? "border-[#ED742F]/55 bg-[rgba(237,116,47,0.14)] text-[#8E3D17]"
                          : "border-[rgba(17,17,17,0.14)] bg-white text-abj-text1 hover:border-[#ED742F]/45 hover:bg-[rgba(237,116,47,0.08)]"
                      }`}
                    >
                      <ChannelAvatar channelName={channel.channelName} avatarUrl={channel.avatarUrl} />
                      <span className="max-w-[180px] truncate text-xs font-semibold uppercase tracking-[0.08em]">{channel.channelName}</span>
                      {featured ? <span className="rounded-full bg-[#ED742F] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-white">ABJ</span> : null}
                    </button>
                  );
                })}
              </div>
            </div>

            {activeChannel ? (
              <div className="rounded-[24px] border border-[rgba(17,17,17,0.12)] bg-[#FCFAF7] p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <ChannelAvatar channelName={activeChannel.channelName} avatarUrl={activeChannel.avatarUrl} />
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-abj-text2">Aktivní kanál</p>
                      <p className="text-lg font-black tracking-tight text-abj-text1">{activeChannel.channelName}</p>
                    </div>
                  </div>
                  <FollowChannelButton
                    channelId={activeChannel.channelId ?? `source:${normalizeForSearch(activeChannel.channelName)}`}
                    channelName={activeChannel.channelName}
                  />
                </div>

                {(() => {
                  const fallbackVideos = fetchedVideosByChannel[activeChannel.channelName] ?? [];
                  const latestVideos = (activeChannel.videos.length > 0 ? activeChannel.videos : fallbackVideos).slice(0, 6);
                  const loadingFallbackVideos = Boolean(loadingByChannel[activeChannel.channelName]);
                  const loadingError = errorByChannel[activeChannel.channelName] ?? "";
                  if (loadingFallbackVideos) {
                    return (
                      <p className="rounded-2xl border border-[rgba(17,17,17,0.14)] bg-white px-4 py-3 text-sm text-abj-text2">
                        Načítám nejnovější videa přímo z kanálu...
                      </p>
                    );
                  }
                  if (latestVideos.length > 0) {
                    return (
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {latestVideos.map((video) => (
                          <button
                            key={`${activeChannel.channelName}-${video.videoId}`}
                            type="button"
                            onClick={() => onSelectVideo({ channelName: activeChannel.channelName, video })}
                            className="group overflow-hidden rounded-2xl border border-[rgba(17,17,17,0.14)] bg-white text-left shadow-[0_10px_20px_rgba(17,17,17,0.08)] transition hover:-translate-y-[1px] hover:border-[#ED742F]/35 hover:shadow-[0_16px_28px_rgba(17,17,17,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ED742F]/45"
                          >
                            <div className="relative aspect-[16/9] w-full overflow-hidden bg-abj-main">
                              <Image
                                src={video.thumbnail ?? "/placeholder-thumb.jpg"}
                                alt={video.title}
                                fill
                                sizes="(min-width: 1280px) 22vw, (min-width: 768px) 40vw, 90vw"
                                className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                                unoptimized
                              />
                            </div>
                            <div className="space-y-1 px-3 py-3">
                              <p className="line-clamp-2 text-sm font-semibold leading-snug text-abj-text1">{video.title}</p>
                              <p className="text-xs text-abj-text2">Publikováno {formatPublishedLabel(video.publishedAt)}</p>
                              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#A5491D]">Přehrát v hlavním okně</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    );
                  }
                  if (activeChannel.channelId || activeChannel.channelUrl) {
                    return (
                      <div className="space-y-3">
                        <p className="rounded-2xl border border-[rgba(17,17,17,0.14)] bg-white px-4 py-3 text-sm text-abj-text2">
                          {loadingError || "Kanál momentálně neposkytuje dostupná videa."}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            void loadFallbackVideos(activeChannel);
                          }}
                          className="inline-flex min-h-10 items-center rounded-full border border-[#ED742F] bg-[#ED742F] px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-white hover:bg-[#d86625]"
                        >
                          Načíst videa kanálu
                        </button>
                      </div>
                    );
                  }
                  return (
                    <p className="rounded-2xl border border-[rgba(17,17,17,0.14)] bg-white px-4 py-3 text-sm text-abj-text2">
                      U tohoto kanálu chybí interní mapování na YouTube kanál, proto nejde načíst nejnovější videa.
                    </p>
                  );
                })()}
              </div>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}

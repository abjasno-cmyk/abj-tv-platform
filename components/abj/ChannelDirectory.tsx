"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
    <span className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[rgba(255,255,255,0.9)] shadow-[0_4px_10px_rgba(17,17,17,0.08)]">
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
  const channelScrollRef = useRef<HTMLDivElement | null>(null);
  const [channelScrollState, setChannelScrollState] = useState({ left: 0, max: 0 });

  const orderedChannels = useMemo(
    () => [...channels].sort((a, b) => a.channelName.localeCompare(b.channelName, "cs-CZ")),
    [channels]
  );
  const activeChannel = useMemo(
    () => orderedChannels.find((channel) => channel.channelName === activeChannelName) ?? null,
    [orderedChannels, activeChannelName]
  );
  const canScrollChannels = channelScrollState.max > 6;

  const updateChannelScrollState = useCallback(() => {
    const container = channelScrollRef.current;
    if (!container) {
      setChannelScrollState({ left: 0, max: 0 });
      return;
    }
    setChannelScrollState({
      left: Math.max(0, container.scrollLeft),
      max: Math.max(0, container.scrollWidth - container.clientWidth),
    });
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => updateChannelScrollState());
    const onResize = () => updateChannelScrollState();
    window.addEventListener("resize", onResize);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
    };
  }, [orderedChannels.length, updateChannelScrollState]);

  useEffect(() => {
    const container = channelScrollRef.current;
    if (!container) return;
    const onScroll = () => updateChannelScrollState();
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, [updateChannelScrollState]);

  const scrollChannelsBy = useCallback((direction: "left" | "right") => {
    const container = channelScrollRef.current;
    if (!container) return;
    const maxLeft = Math.max(0, container.scrollWidth - container.clientWidth);
    if (maxLeft <= 6) return;
    const currentLeft = Math.max(0, container.scrollLeft);
    const step = 260;

    if (direction === "right") {
      const nextLeft = currentLeft + step;
      container.scrollTo({
        left: nextLeft >= maxLeft - 2 ? 0 : Math.min(maxLeft, nextLeft),
        behavior: "smooth",
      });
      return;
    }

    const nextLeft = currentLeft - step;
    container.scrollTo({
      left: currentLeft <= 2 ? maxLeft : Math.max(0, nextLeft),
      behavior: "smooth",
    });
  }, []);

  const loadFallbackVideos = async (channel: LiveChannelGroup) => {
    const channelKey = channel.channelName;
    const channelId = channel.channelId;
    const channelUrl = channel.channelUrl;
    if (channel.videos.length > 0) return;
    if (!channelId && !channelUrl && !channel.channelName.trim()) return;
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
    <section className="rounded-[6px] border border-[rgba(23,20,17,0.1)] bg-white px-5 py-5 text-[#171411]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="vx-display text-2xl tracking-[-0.01em] text-[#171411]">Kanály</h3>
          <p className="vx-meta mt-1 uppercase tracking-[0.16em]">Vyberte kanál a spusťte videa</p>
        </div>
        <span className="rounded-full bg-[rgba(243,112,33,0.14)] px-3 py-1 text-xs font-semibold text-[#B8480A]">
          {orderedChannels.length} kanálů
        </span>
      </div>

      <div className="space-y-4">
        {orderedChannels.length === 0 ? (
          <p className="rounded-2xl bg-white px-4 py-3 text-sm text-abj-text2">
            Seznam kanálů se připravuje.
          </p>
        ) : (
          <>
            <div
              ref={channelScrollRef}
              className="-mx-1 overflow-x-auto rounded-2xl bg-white p-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            >
              <div className="flex min-w-max gap-2">
                {orderedChannels.map((channel) => {
                  const selected = activeChannelName === channel.channelName;
                  const featured = isAbyByloJasno(channel.channelName);
                  return (
                    <button
                      key={channel.channelName}
                      type="button"
                      onClick={() => {
                        setActiveChannelName((prev) => (prev === channel.channelName ? null : channel.channelName));
                        if (channel.videos.length === 0) {
                          void loadFallbackVideos(channel);
                        }
                      }}
                      className={`inline-flex min-h-12 items-center gap-2 rounded-full px-3 py-2 text-left shadow-[0_3px_10px_rgba(17,17,17,0.1)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F37021]/45 ${
                        selected
                          ? "bg-[rgba(243, 112, 33,0.14)] text-[#111111]"
                          : "bg-white text-abj-text1 hover:bg-[rgba(243, 112, 33,0.08)]"
                      }`}
                    >
                      <ChannelAvatar channelName={channel.channelName} avatarUrl={channel.avatarUrl} />
                      <span className="max-w-[180px] truncate text-xs font-semibold uppercase tracking-[0.08em]">{channel.channelName}</span>
                      {featured ? <span className="rounded-full bg-[#F37021] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-white">ABJ</span> : null}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-1 flex items-center gap-2 sm:gap-3">
              <p className="text-lg font-black uppercase leading-none tracking-[0.08em] text-[#111111] sm:text-[33px] sm:tracking-[0.06em]">
                CHANNELS
              </p>
              <button
                type="button"
                onClick={() => scrollChannelsBy("left")}
                disabled={!canScrollChannels}
                aria-label="Posunout kanály doleva"
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#111111] bg-white text-xs font-bold text-[#111111] transition disabled:opacity-35 sm:h-8 sm:w-8 sm:text-sm"
              >
                ←
              </button>
              <button
                type="button"
                onClick={() => scrollChannelsBy("right")}
                disabled={!canScrollChannels}
                aria-label="Posunout kanály doprava"
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#F37021] bg-[#F37021] text-xs font-bold text-white transition disabled:opacity-35 sm:h-8 sm:w-8 sm:text-sm"
              >
                →
              </button>
              <div className="relative h-4 min-w-[110px] flex-1 overflow-hidden rounded-[2px] bg-[#F37021] sm:h-5">
                <input
                  type="range"
                  min={0}
                  max={Math.max(1, Math.round(channelScrollState.max))}
                  value={Math.min(Math.round(channelScrollState.left), Math.max(1, Math.round(channelScrollState.max)))}
                  onChange={(event) => {
                    const container = channelScrollRef.current;
                    if (!container) return;
                    container.scrollTo({
                      left: Number(event.currentTarget.value),
                      behavior: "auto",
                    });
                  }}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  disabled={!canScrollChannels}
                  aria-label="Posuvník kanálů"
                />
              </div>
            </div>

            {activeChannel ? (
              <div className="rounded-[24px] bg-white p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <ChannelAvatar channelName={activeChannel.channelName} avatarUrl={activeChannel.avatarUrl} />
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#111111]/55">Aktivní kanál</p>
                      <p className="text-lg font-black tracking-tight text-[#111111]">{activeChannel.channelName}</p>
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
                      <p className="rounded-2xl bg-white px-4 py-3 text-sm text-abj-text2">
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
                            className="group overflow-hidden rounded-2xl bg-white text-left shadow-[0_10px_20px_rgba(17,17,17,0.08)] transition hover:-translate-y-[1px] hover:shadow-[0_16px_28px_rgba(17,17,17,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F37021]/45"
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
                              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#F37021]">Přehrát v hlavním okně</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    );
                  }
                  if (activeChannel.channelId || activeChannel.channelUrl) {
                    return (
                      <div className="space-y-3">
                        <p className="rounded-2xl bg-white px-4 py-3 text-sm text-abj-text2">
                          {loadingError || "Kanál momentálně neposkytuje dostupná videa."}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            void loadFallbackVideos(activeChannel);
                          }}
                          className="inline-flex min-h-10 items-center rounded-full bg-[#F37021] px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-white hover:opacity-90"
                        >
                          Načíst videa kanálu
                        </button>
                      </div>
                    );
                  }
                  return (
                    <p className="rounded-2xl bg-white px-4 py-3 text-sm text-abj-text2">
                      U tohoto kanálu chybí interní mapování na YouTube kanál, proto nejde načíst nejnovější videa.
                    </p>
                  );
                })()}
              </div>
            ) : (
              <p className="rounded-2xl bg-white px-4 py-3 text-sm text-[#111111]/70">
                Klikněte na vybraný kanál pro zobrazení detailu.
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}

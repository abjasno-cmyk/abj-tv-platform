"use client";

import { useMemo, useState } from "react";
import Image from "next/image";

export type LiveChannelVideo = {
  videoId: string;
  title: string;
  thumbnail: string | null;
  publishedAt: string;
};

export type LiveChannelGroup = {
  channelName: string;
  videos: LiveChannelVideo[];
};

type ChannelDirectoryProps = {
  channels: LiveChannelGroup[];
  onSelectVideo: (payload: { channelName: string; video: LiveChannelVideo }) => void;
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

export function ChannelDirectory({ channels, onSelectVideo }: ChannelDirectoryProps) {
  const [expandedChannel, setExpandedChannel] = useState<string | null>(null);

  const orderedChannels = useMemo(
    () => [...channels].sort((a, b) => a.channelName.localeCompare(b.channelName, "cs-CZ")),
    [channels]
  );

  return (
    <section className="rounded-[26px] border border-abj-goldDim bg-abj-panel px-5 py-5 shadow-[0_12px_28px_rgba(17,17,17,0.06)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-extrabold tracking-tight text-abj-text1">Kanály</h3>
          <p className="text-xs uppercase tracking-[0.16em] text-abj-text2">Statický abecední seznam</p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-abj-text2">
          {orderedChannels.length} kanálů
        </span>
      </div>

      <div className="space-y-3">
        {orderedChannels.length === 0 ? (
          <p className="rounded-2xl border border-[rgba(17,17,17,0.14)] bg-white px-4 py-3 text-sm text-abj-text2">
            Seznam kanálů se připravuje.
          </p>
        ) : (
          orderedChannels.map((channel) => {
            const expanded = expandedChannel === channel.channelName;
            const featured = isAbyByloJasno(channel.channelName);
            const latestVideos = channel.videos.slice(0, 4);
            return (
              <div key={channel.channelName} className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setExpandedChannel((current) => (current === channel.channelName ? null : channel.channelName));
                  }}
                  className={`w-full rounded-2xl border text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A00] ${
                    featured
                      ? "border-[#FF6A00]/55 bg-[rgba(255,106,0,0.12)] px-5 py-4 text-base font-extrabold text-[#9F3D00] shadow-[0_10px_24px_rgba(255,106,0,0.15)]"
                      : "border-[rgba(17,17,17,0.16)] bg-white px-4 py-3 text-sm font-semibold text-abj-text1 hover:border-[#FF6A00]/45 hover:bg-[rgba(255,106,0,0.06)]"
                  }`}
                  aria-expanded={expanded}
                >
                  <span className="flex flex-wrap items-center justify-between gap-3">
                    <span className="line-clamp-1">{channel.channelName}</span>
                    <span className="text-xs uppercase tracking-[0.08em] text-abj-text2">
                      {expanded ? "Skrýt videa" : "Ukázat 4 videa"}
                    </span>
                  </span>
                </button>

                {expanded ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {latestVideos.length > 0 ? (
                      latestVideos.map((video) => (
                        <button
                          key={`${channel.channelName}-${video.videoId}`}
                          type="button"
                          onClick={() => onSelectVideo({ channelName: channel.channelName, video })}
                          className="group overflow-hidden rounded-2xl border border-[rgba(17,17,17,0.14)] bg-white text-left shadow-[0_8px_18px_rgba(17,17,17,0.08)] transition hover:-translate-y-[1px] hover:shadow-[0_14px_28px_rgba(17,17,17,0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A00]"
                        >
                          <div className="relative aspect-[16/9] w-full overflow-hidden bg-abj-main">
                            <Image
                              src={video.thumbnail ?? "/placeholder-thumb.jpg"}
                              alt={video.title}
                              fill
                              sizes="(min-width: 1024px) 25vw, 90vw"
                              className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                              unoptimized
                            />
                          </div>
                          <div className="space-y-1 px-3 py-3">
                            <p className="line-clamp-2 text-sm font-semibold leading-snug text-abj-text1">{video.title}</p>
                            <p className="text-xs text-abj-text2">Publikováno {formatPublishedLabel(video.publishedAt)}</p>
                          </div>
                        </button>
                      ))
                    ) : (
                      <p className="rounded-2xl border border-[rgba(17,17,17,0.14)] bg-white px-4 py-3 text-sm text-abj-text2 sm:col-span-2">
                        Tento kanál zatím nemá dostupná videa.
                      </p>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

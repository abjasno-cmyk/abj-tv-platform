"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import YouTube, { type YouTubeProps } from "react-youtube";

import type { PlaylistItem } from "@/lib/buildPlaylist";

type TVPlayerProps = {
  playlist: PlaylistItem[];
};

const QUEUE_SIZE = 8;

export default function TVPlayer({ playlist }: TVPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [embedBlocked, setEmbedBlocked] = useState(false);
  const [readyVideoId, setReadyVideoId] = useState<string | null>(null);
  const currentItem = playlist[currentIndex];

  const playerOptions = useMemo<YouTubeProps["opts"]>(
    () => ({
      width: "100%",
      height: "100%",
      playerVars: {
        autoplay: 1,
        rel: 0,
        modestbranding: 1,
        playsinline: 1,
      },
    }),
    [],
  );

  if (!currentItem) {
    return null;
  }

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + playlist.length) % playlist.length);
    setEmbedBlocked(false);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % playlist.length);
    setEmbedBlocked(false);
  };

  const upcomingItems = Array.from({ length: Math.min(QUEUE_SIZE, playlist.length - 1) }, (_, idx) => {
    const queueIndex = (currentIndex + idx + 1) % playlist.length;
    return {
      queueIndex,
      item: playlist[queueIndex],
    };
  });

  const youtubeUrl = `https://www.youtube.com/watch?v=${currentItem.videoId}`;

  return (
    <section className="space-y-6">
      <div className="relative aspect-video w-full overflow-hidden rounded-3xl bg-slate-950 shadow-md">
        {readyVideoId !== currentItem.videoId ? (
          <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900" />
        ) : null}
        <YouTube
          key={currentItem.videoId}
          videoId={currentItem.videoId}
          title={currentItem.title}
          iframeClassName={`h-full w-full transition-opacity duration-500 ${
            readyVideoId === currentItem.videoId ? "opacity-100" : "opacity-0"
          }`}
          opts={playerOptions}
          onReady={() => {
            setReadyVideoId(currentItem.videoId);
          }}
          onPlay={() => setEmbedBlocked(false)}
          onError={() => setEmbedBlocked(true)}
          onEnd={() => {
            setCurrentIndex((prev) => (prev + 1) % playlist.length);
          }}
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black/75 via-black/40 to-transparent" />
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-300">
            {currentItem.channelName}
          </p>
          <h2 className="mt-1 line-clamp-2 text-2xl font-semibold text-white">
            {currentItem.title}
          </h2>
        </div>
      </div>

      <div className="space-y-4 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm transition-all duration-200 ease-in-out">
        <p className="text-sm text-gray-500">Now playing</p>
        <h3 className="text-xl font-semibold leading-snug text-gray-900">{currentItem.title}</h3>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={goToPrevious}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-gray-900 transition duration-200 ease-in-out hover:bg-blue-100"
          >
            Předchozí video
          </button>
          <button
            type="button"
            onClick={goToNext}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-gray-900 transition duration-200 ease-in-out hover:bg-blue-100"
          >
            Další video
          </button>
        </div>
        {embedBlocked ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Embedded přehrávání je omezené. Otevři video přímo na YouTube.
          </div>
        ) : null}
        <Link
          href={youtubeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center text-sm font-medium text-blue-600 transition duration-200 ease-in-out hover:underline"
        >
          Otevřít aktuální video na YouTube
        </Link>
      </div>

      {upcomingItems.length > 0 ? (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Následuje</h3>
          <ul className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
            {upcomingItems.map(({ queueIndex, item }, position) => (
              <li key={`${item.videoId}-${queueIndex}`} className="w-48 shrink-0 snap-start">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentIndex(queueIndex);
                    setEmbedBlocked(false);
                  }}
                  className="group w-full rounded-xl border border-slate-100 bg-white p-2 text-left shadow-sm transition duration-200 ease-in-out hover:scale-105 hover:shadow-md"
                >
                  <div className="overflow-hidden rounded-lg">
                    <Image
                      src={`https://img.youtube.com/vi/${item.videoId}/hqdefault.jpg`}
                      alt={item.title}
                      width={320}
                      height={180}
                      className="h-24 w-full object-cover transition duration-200 ease-in-out group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                  <p className="mt-2 text-[11px] text-gray-500">#{position + 1} · {item.channelName}</p>
                  <p className="line-clamp-2 text-sm font-medium text-gray-900">{item.title}</p>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

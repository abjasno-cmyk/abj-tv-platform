"use client";

import Link from "next/link";
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
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-white shadow-md">
        {readyVideoId !== currentItem.videoId ? (
          <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100" />
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
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-gray-900/25 to-transparent" />
      </div>

      <div className="space-y-4 rounded-2xl bg-white p-6 shadow-md transition-all duration-200 ease-in-out">
        <p className="text-sm text-gray-500">{currentItem.channelName}</p>
        <h2 className="text-xl font-semibold leading-snug text-gray-900">{currentItem.title}</h2>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={goToPrevious}
            className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-900 transition duration-200 ease-in-out hover:bg-blue-100"
          >
            Předchozí video
          </button>
          <button
            type="button"
            onClick={goToNext}
            className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-900 transition duration-200 ease-in-out hover:bg-blue-100"
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
        <div className="rounded-2xl bg-white p-6 shadow-md">
          <h3 className="mb-3 text-lg font-medium text-gray-900">Následuje</h3>
          <ul className="space-y-3">
            {upcomingItems.map(({ queueIndex, item }, position) => (
              <li key={`${item.videoId}-${queueIndex}`}>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentIndex(queueIndex);
                    setEmbedBlocked(false);
                  }}
                  className="w-full rounded-2xl border border-transparent bg-white px-3 py-2 text-left transition duration-200 ease-in-out hover:bg-blue-100"
                >
                  <p className="text-xs text-gray-500">
                    #{position + 1} · {item.channelName}
                  </p>
                  <p className="line-clamp-2 text-sm text-gray-900">{item.title}</p>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

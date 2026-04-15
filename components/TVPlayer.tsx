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
    <section className="space-y-4">
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-neutral-950 shadow-lg">
        {readyVideoId !== currentItem.videoId ? (
          <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900" />
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
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/70 to-transparent" />
      </div>

      <div className="space-y-3 rounded-2xl border border-white/10 bg-neutral-950 p-6 shadow-lg transition-all duration-300">
        <p className="text-sm text-gray-400">{currentItem.channelName}</p>
        <h2 className="text-xl font-semibold text-white">{currentItem.title}</h2>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={goToPrevious}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
          >
            Předchozí video
          </button>
          <button
            type="button"
            onClick={goToNext}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
          >
            Další video
          </button>
        </div>
        {embedBlocked ? (
          <div className="rounded-xl border border-amber-200/30 bg-amber-200/10 p-4 text-sm text-amber-200">
            Embedded přehrávání je omezené. Otevři video přímo na YouTube.
          </div>
        ) : null}
        <Link
          href={youtubeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center text-sm font-medium text-gray-300 transition hover:text-white hover:underline"
        >
          Otevřít aktuální video na YouTube
        </Link>
      </div>

      {upcomingItems.length > 0 ? (
        <div className="rounded-2xl border border-white/10 bg-neutral-950 p-4 shadow-lg">
          <h3 className="mb-3 text-sm font-semibold text-gray-300">Následuje</h3>
          <ul className="space-y-3">
            {upcomingItems.map(({ queueIndex, item }, position) => (
              <li key={`${item.videoId}-${queueIndex}`}>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentIndex(queueIndex);
                    setEmbedBlocked(false);
                  }}
                  className="w-full rounded-xl border border-transparent bg-white/0 px-3 py-2 text-left transition hover:border-white/10 hover:bg-white/5"
                >
                  <p className="text-xs text-gray-400">
                    #{position + 1} · {item.channelName}
                  </p>
                  <p className="line-clamp-2 text-sm text-white">{item.title}</p>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

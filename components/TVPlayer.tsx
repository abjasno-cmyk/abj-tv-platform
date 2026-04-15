"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import YouTube, { type YouTubeProps } from "react-youtube";

import type { PlaylistItem } from "@/lib/types";

type TVPlayerProps = {
  playlist: PlaylistItem[];
  initialIndex?: number;
};

const QUEUE_SIZE = 8;

function normalizeInitialIndex(length: number, initialIndex?: number): number {
  if (!length || initialIndex === undefined) {
    return 0;
  }
  if (initialIndex < 0 || initialIndex >= length) {
    return 0;
  }
  return initialIndex;
}

export default function TVPlayer({ playlist, initialIndex }: TVPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(
    normalizeInitialIndex(playlist.length, initialIndex)
  );
  const [embedBlocked, setEmbedBlocked] = useState(false);
  const currentItem = playlist[currentIndex];

  const playerOptions = useMemo<YouTubeProps["opts"]>(
    () => ({
      width: "100%",
      playerVars: {
        autoplay: 1,
        rel: 0,
        modestbranding: 1,
        playsinline: 1,
      },
    }),
    [],
  );

  useEffect(() => {
    setCurrentIndex(normalizeInitialIndex(playlist.length, initialIndex));
  }, [playlist, initialIndex]);

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
    <section className="space-y-3">
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-black">
        <YouTube
          key={currentItem.videoId}
          videoId={currentItem.videoId}
          title={currentItem.title}
          iframeClassName="h-[220px] w-full sm:h-[360px]"
          opts={playerOptions}
          onPlay={() => setEmbedBlocked(false)}
          onError={() => setEmbedBlocked(true)}
          onEnd={() => {
            setCurrentIndex((prev) => (prev + 1) % playlist.length);
          }}
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm text-gray-500">{currentItem.channelName}</p>
        <h2 className="text-base font-medium text-gray-900">{currentItem.title}</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={goToPrevious}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Předchozí video
          </button>
          <button
            type="button"
            onClick={goToNext}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Další video
          </button>
        </div>
        {embedBlocked ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Embedded přehrávání je omezené. Otevři video přímo na YouTube.
          </div>
        ) : null}
        <Link
          href={youtubeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center text-sm font-medium text-blue-700 hover:text-blue-800 hover:underline"
        >
          Otevřít aktuální video na YouTube
        </Link>
      </div>

      {upcomingItems.length > 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-3">
          <h3 className="mb-2 text-sm font-semibold text-gray-700">Následuje</h3>
          <ul className="space-y-2">
            {upcomingItems.map(({ queueIndex, item }, position) => (
              <li key={`${item.videoId}-${queueIndex}`}>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentIndex(queueIndex);
                    setEmbedBlocked(false);
                  }}
                  className="w-full rounded-md px-2 py-1 text-left hover:bg-gray-50"
                >
                  <p className="text-xs text-gray-500">
                    #{position + 1} · {item.channelName}
                  </p>
                  <p className="line-clamp-2 text-sm text-gray-800">{item.title}</p>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

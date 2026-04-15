"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import YouTube, { type YouTubeProps } from "react-youtube";

import type { PlaylistItem } from "@/lib/types";

type TVPlayerProps = {
  playlist: PlaylistItem[];
  initialIndex?: number;
};

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
    </section>
  );
}

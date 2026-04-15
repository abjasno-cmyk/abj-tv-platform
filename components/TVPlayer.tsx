"use client";

import { useMemo, useState } from "react";
import YouTube, { type YouTubeProps } from "react-youtube";

import type { PlaylistItem } from "@/lib/types";

type TVPlayerProps = {
  playlist: PlaylistItem[];
};

export default function TVPlayer({ playlist }: TVPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
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

  if (!currentItem) {
    return null;
  }

  return (
    <section className="space-y-3">
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-black">
        <YouTube
          key={currentItem.videoId}
          videoId={currentItem.videoId}
          title={currentItem.title}
          iframeClassName="h-[220px] w-full sm:h-[360px]"
          opts={playerOptions}
          onEnd={() => {
            setCurrentIndex((prev) => (prev + 1) % playlist.length);
          }}
        />
      </div>

      <div className="space-y-1">
        <p className="text-sm text-gray-500">{currentItem.channelName}</p>
        <h2 className="text-base font-medium text-gray-900">{currentItem.title}</h2>
      </div>
    </section>
  );
}

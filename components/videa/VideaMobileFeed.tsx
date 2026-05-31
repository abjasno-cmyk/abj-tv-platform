"use client";

import { useEffect, useMemo, useState } from "react";

import { VeroxDoubleDivider } from "@/components/abj/VeroxDoubleDivider";
import { VideaVideoCard } from "@/components/videa/VideaVideoCard";
import { dedupeVideaVideos, mapPostToVideaVideo, parsePublishedMs } from "@/components/videa/videa-feed-utils";
import { useFeed } from "@/hooks/useFeed";

const VIDEO_WINDOW_HOURS = 24;
const EMPTY_MESSAGE = "Za posledních 24 hodin zatím nejsou dostupná žádná videa.";

export function VideaMobileFeed() {
  const { posts, loading, hasMore, loadMore } = useFeed();
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const videoWindowCutoffMs = nowMs - VIDEO_WINDOW_HOURS * 60 * 60 * 1000;

  const videos = useMemo(() => {
    const mapped = dedupeVideaVideos(posts.map(mapPostToVideaVideo))
      .filter((video) => parsePublishedMs(video.publishedAt) >= videoWindowCutoffMs)
      .sort((a, b) => parsePublishedMs(b.publishedAt) - parsePublishedMs(a.publishedAt));
    return mapped;
  }, [posts, videoWindowCutoffMs]);

  const hasOlderOutsideWindow = useMemo(() => {
    return posts.some((post) => {
      const publishedAt = post.video_published_at ?? post.created_at;
      const ts = parsePublishedMs(publishedAt);
      return ts > 0 && ts < videoWindowCutoffMs;
    });
  }, [posts, videoWindowCutoffMs]);

  const showLoadMore = hasMore && !hasOlderOutsideWindow;

  return (
    <div className="verox-videa-mobile-only verox-videa-mobile-shell bg-[var(--vx-white,#FFFFFF)] pb-8 pt-2 text-[#303030]">

      {videos.length === 0 && !loading ? (
        <p className="verox-font-myriad-regular py-6 text-[clamp(0.85rem,1.5vw,0.95rem)] tracking-[0.05em] text-[#717171]">{EMPTY_MESSAGE}</p>
      ) : (
        <div className="mt-2">
          {videos.map((video, index) => (
            <div key={video.key}>
              {index > 0 ? <VeroxDoubleDivider className="my-[clamp(12px,2vw,18px)]" /> : null}
              <VideaVideoCard video={video} />
            </div>
          ))}
          {loading && videos.length === 0
            ? [0, 1, 2].map((slot) => (
                <div key={`skeleton-${slot}`} className="py-4">
                  <div className="verox-videa-card-grid opacity-40">
                    <div className="h-16 bg-[#717171]/20" />
                    <div className="aspect-video bg-[#717171]/20" />
                    <div className="h-24 bg-[#717171]/20" />
                  </div>
                </div>
              ))
            : null}
        </div>
      )}

      {showLoadMore ? (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => {
              void loadMore();
            }}
            className="verox-font-myriad-bold rounded-none border border-[#F37021] bg-white px-4 py-2 text-[clamp(0.85rem,1.5vw,0.95rem)] uppercase tracking-[0.05em] text-[#F37021]"
          >
            {loading ? "Načítám…" : "Načíst další"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

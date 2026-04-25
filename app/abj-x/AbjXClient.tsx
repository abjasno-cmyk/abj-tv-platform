"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { NewsTile } from "@/components/abj/NewsTile";
import { useFeed } from "@/hooks/useFeed";
import type { FeedPost } from "@/lib/api";

type FeedItem = {
  id: string;
  channel: string;
  headline: string;
  what: string;
  why: string | null;
  impact: string | null;
  freshness: "breaking" | "today" | "week" | "evergreen";
  urgency: 1 | 2 | 3;
  displayAt: string;
  videoId: string;
  aiInsight: string;
};

function getPostTimestamp(post: FeedPost): number {
  const editorialAt = (post as FeedPost & { editorial_at?: string | null }).editorial_at;
  const updatedAt = (post as FeedPost & { updated_at?: string | null }).updated_at;
  const candidates = [editorialAt, updatedAt, post.created_at, post.video_published_at];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const parsed = Date.parse(candidate);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function toItems(posts: FeedPost[]): FeedItem[] {
  return posts
    .map((post) => ({
      id: post.id,
      channel: post.channel_name || "Neznámý kanál",
      headline: post.headline?.trim() || post.what?.trim() || "Bez titulku",
      what: post.what?.trim() || "",
      why: post.why?.trim() || null,
      impact: post.impact?.trim() || null,
      freshness: post.freshness,
      urgency: post.urgency,
      displayAt:
        (post as FeedPost & { editorial_at?: string | null }).editorial_at ??
        (post as FeedPost & { updated_at?: string | null }).updated_at ??
        post.created_at,
      videoId: post.video_id,
      aiInsight: post.impact?.trim() || post.why?.trim() || post.what?.trim() || "Bez doplňujícího insightu.",
    }))
    .sort((a, b) => {
      const sourceA = posts.find((post) => post.id === a.id) ?? null;
      const sourceB = posts.find((post) => post.id === b.id) ?? null;
      const aTs = sourceA ? getPostTimestamp(sourceA) : new Date(a.displayAt).getTime();
      const bTs = sourceB ? getPostTimestamp(sourceB) : new Date(b.displayAt).getTime();
      if (!Number.isFinite(aTs) && !Number.isFinite(bTs)) return 0;
      if (!Number.isFinite(aTs)) return 1;
      if (!Number.isFinite(bTs)) return -1;
      return bTs - aTs;
    });
}

function formatCreatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "čas neuveden";
  return new Intl.DateTimeFormat("cs-CZ", {
    timeZone: "Europe/Prague",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function toTag(item: FeedItem): "BREAKING" | "DNES" | "TÝDEN" | "STÁLÉ" {
  if (item.freshness === "breaking") return "BREAKING";
  if (item.freshness === "today") return "DNES";
  if (item.freshness === "week") return "TÝDEN";
  return "STÁLÉ";
}

export function AbjXClient() {
  const { posts, loading, hasMore, loadMore, sseConnected } = useFeed();
  const items = useMemo(() => toItems(posts), [posts]);
  const [likedIds, setLikedIds] = useState<Record<string, boolean>>({});
  const [savedIds, setSavedIds] = useState<Record<string, boolean>>({});
  const [expandedTopicIds, setExpandedTopicIds] = useState<Record<string, boolean>>({});
  const loadMoreAnchorRef = useRef<HTMLDivElement | null>(null);
  const totalCount = items.length;
  const breakingCount = items.filter((item) => item.freshness === "breaking").length;
  const todayCount = items.filter((item) => item.freshness === "today").length;

  useEffect(() => {
    const anchor = loadMoreAnchorRef.current;
    if (!anchor || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        if (loading) return;
        void loadMore();
      },
      {
        rootMargin: "220px 0px",
        threshold: 0.1,
      }
    );

    observer.observe(anchor);
    return () => observer.disconnect();
  }, [hasMore, loadMore, loading]);

  return (
    <section className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-5">
      <header className="space-y-3">
        <p className="text-[11px] uppercase tracking-[0.14em] text-abj-text2">ABJ X</p>
        <h1 className="font-[var(--font-serif)] text-3xl font-semibold text-abj-text1">Textové zprávy</h1>
        <p className="text-sm text-abj-text2">Krátké zprávy a souvislosti napříč ABJ sítí</p>
        <div className="flex flex-wrap gap-2 text-xs text-abj-text2">
          <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1">{totalCount} zpráv</span>
          <span className="rounded-full border border-red-400/35 bg-red-500/10 px-2.5 py-1">{breakingCount} BREAKING</span>
          <span className="rounded-full border border-yellow-400/35 bg-yellow-500/10 px-2.5 py-1">{todayCount} DNES</span>
          <span
            className={`rounded-full border px-2.5 py-1 ${
              sseConnected
                ? "border-emerald-400/35 bg-emerald-500/10 text-emerald-200"
                : "border-white/10 bg-white/[0.03] text-abj-text2"
            }`}
          >
            {sseConnected ? "Live sync aktivní" : "Live sync čeká"}
          </span>
        </div>
      </header>

      {items.length === 0 && !loading ? (
        <div className="rounded-xl border border-[var(--abj-gold-dim)] bg-abj-panel p-6 text-sm text-abj-text2">
          Zatím žádné textové zprávy.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {loading && items.length === 0
            ? Array.from({ length: 6 }, (_, idx) => (
                <div key={`skeleton-${idx}`} className="h-40 animate-pulse rounded-xl bg-gray-800" />
              ))
            : items.map((item, index) => (
                <NewsTile
                  key={item.id}
                  className={
                    index % 3 === 1
                      ? "xl:mt-4"
                      : index % 3 === 2
                        ? "md:mt-2 xl:mt-7"
                        : "md:mt-0"
                  }
                  title={item.headline}
                  summary={item.what}
                  source={item.channel}
                  time={formatCreatedAt(item.displayAt)}
                  tag={toTag(item)}
                  aiInsight={item.aiInsight}
                  liked={Boolean(likedIds[item.id])}
                  saved={Boolean(savedIds[item.id])}
                  onToggleLike={() =>
                    setLikedIds((prev) => ({
                      ...prev,
                      [item.id]: !prev[item.id],
                    }))
                  }
                  onToggleSave={() =>
                    setSavedIds((prev) => ({
                      ...prev,
                      [item.id]: !prev[item.id],
                    }))
                  }
                  onShowMore={() =>
                    setExpandedTopicIds((prev) => ({
                      ...prev,
                      [item.id]: !prev[item.id],
                    }))
                  }
                />
              ))}
          {Object.values(expandedTopicIds).some(Boolean) ? (
            <div className="md:col-span-2 xl:col-span-3 rounded-xl border border-yellow-400/30 bg-yellow-500/10 p-4 text-sm text-yellow-100">
              Zobrazení podobných témat je připravené jako UX placeholder pro navazující implementaci filtrů.
            </div>
          ) : null}
        </div>
      )}

      {hasMore ? <div ref={loadMoreAnchorRef} className="h-2 w-full" aria-hidden /> : null}

      {hasMore ? (
        <div className="flex justify-center">
          <button
            type="button"
            className="rounded-lg border border-[var(--abj-gold-dim)] bg-abj-panel px-4 py-2 text-xs uppercase tracking-[0.08em] text-abj-text2 hover:text-abj-text1"
            onClick={() => {
              void loadMore();
            }}
          >
            {loading ? "Načítám..." : "Načíst další"}
          </button>
        </div>
      ) : null}
    </section>
  );
}

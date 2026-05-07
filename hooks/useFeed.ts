"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { fetchFeed, type FeedPost } from "@/lib/api";

const POLL_INTERVAL_MS = 3 * 60 * 1000; // 3 minutes
const PAGE_SIZE = 20;
const ENABLE_REPLIT_FEED_SSE = process.env.NEXT_PUBLIC_ENABLE_REPLIT_FEED_SSE === "1";

type UseFeedFilter = {
  freshness?: string;
  urgency?: number;
};

type UseFeedResult = {
  posts: FeedPost[];
  loading: boolean;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  reset: () => void;
  sseConnected: boolean;
};

function makeFilterKey(filter: UseFeedFilter | undefined): string {
  return JSON.stringify({
    freshness: filter?.freshness ?? null,
    urgency: filter?.urgency ?? null,
  });
}

export function useFeed(filter?: UseFeedFilter): UseFeedResult {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const latestMarkerRef = useRef<string | null>(null);
  const topBatchMarkerRef = useRef<string | null>(null);
  const loadingRef = useRef(false);
  const hasMoreRef = useRef(true);
  const pageRef = useRef(1);
  const filterRef = useRef<UseFeedFilter | undefined>(filter);
  const [sseConnected, setSseConnected] = useState(false);

  const getPostTimestamp = useCallback((post: FeedPost): number => {
    const editorialAt = (post as FeedPost & { editorial_at?: string | null }).editorial_at;
    const updatedAt = (post as FeedPost & { updated_at?: string | null }).updated_at;
    const candidates = [editorialAt, updatedAt, post.created_at, post.video_published_at];
    for (const candidate of candidates) {
      if (!candidate) continue;
      const parsed = Date.parse(candidate);
      if (Number.isFinite(parsed)) return parsed;
    }
    return 0;
  }, []);

  const makePostMarker = useCallback((post: FeedPost | null | undefined): string | null => {
    if (!post) return null;
    const ts = getPostTimestamp(post);
    return `${post.id}|${ts}|${post.headline}|${post.what}|${post.why ?? ""}|${post.impact ?? ""}`;
  }, [getPostTimestamp]);

  const mergePosts = useCallback((current: FeedPost[], incoming: FeedPost[]): FeedPost[] => {
    const byId = new Map<string, FeedPost>();
    for (const post of current) {
      byId.set(post.id, post);
    }
    for (const post of incoming) {
      const existing = byId.get(post.id);
      if (!existing) {
        byId.set(post.id, post);
        continue;
      }
      byId.set(post.id, {
        ...existing,
        ...post,
        // Ensure stable id in case upstream sends inconsistent payload.
        id: existing.id,
      });
    }

    return [...byId.values()].sort((a, b) => getPostTimestamp(b) - getPostTimestamp(a));
  }, [getPostTimestamp]);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  const filterKey = useMemo(() => makeFilterKey(filter), [filter]);

  useEffect(() => {
    filterRef.current = filter;
  }, [filterKey, filter]);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMoreRef.current) return;
    loadingRef.current = true;
    setLoading(true);

    try {
      const data = await fetchFeed({
        page: pageRef.current,
        per_page: PAGE_SIZE,
        freshness: filterRef.current?.freshness,
        urgency: filterRef.current?.urgency,
      });
      if (!data) return;
      setPosts((prev) => mergePosts(prev, data.posts));
      latestMarkerRef.current = makePostMarker(data.posts[0]);
      topBatchMarkerRef.current = data.posts.slice(0, 5).map((post) => makePostMarker(post) ?? "").join("||");
      setHasMore(Boolean(data.has_more));
      setPage((prev) => prev + 1);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [makePostMarker, mergePosts]);

  const reset = () => {
    setPosts([]);
    setPage(1);
    setHasMore(true);
    latestMarkerRef.current = null;
    pageRef.current = 1;
    hasMoreRef.current = true;
  };

  useEffect(() => {
    let cancelled = false;
    reset();

    const initialLoad = async () => {
      if (!cancelled) {
        await loadMore();
      }
    };

    const poll = async () => {
      const data = await fetchFeed({
        page: 1,
        per_page: 5,
        freshness: filterRef.current?.freshness,
        urgency: filterRef.current?.urgency,
      });
      if (!data || data.posts.length === 0 || cancelled) return;

      const newestMarker = makePostMarker(data.posts[0]);
      const nextBatchMarker = data.posts.slice(0, 5).map((post) => makePostMarker(post) ?? "").join("||");
      if (nextBatchMarker && nextBatchMarker === topBatchMarkerRef.current) return;
      topBatchMarkerRef.current = nextBatchMarker || null;
      if (newestMarker) {
        latestMarkerRef.current = newestMarker;
      }

      setPosts((prev) => mergePosts(prev, data.posts));
    };

    void initialLoad();
    const timer = window.setInterval(() => {
      void poll();
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [filterKey, loadMore, makePostMarker, mergePosts]);

  useEffect(() => {
    const usesFilter = Boolean(filterRef.current?.freshness || filterRef.current?.urgency);
    if (usesFilter) return;
    if (!ENABLE_REPLIT_FEED_SSE) return;

    let cancelled = false;
    let retries = 0;
    let source: EventSource | null = null;

    const connect = () => {
      if (cancelled) return;
      source = new EventSource("/api/replit/feed/stream");

      source.addEventListener("open", () => {
        retries = 0;
        if (!cancelled) setSseConnected(true);
      });

      source.addEventListener("ping", () => {
        if (!cancelled) setSseConnected(true);
      });

      source.addEventListener("new_post", (event) => {
        try {
          const post = JSON.parse(event.data) as FeedPost;
          if (!post?.id || !post.video_id) return;
          latestMarkerRef.current = makePostMarker(post);
          topBatchMarkerRef.current = null;
          setPosts((prev) => mergePosts(prev, [post]));
        } catch {
          // Ignore malformed SSE payload.
        }
      });

      source.addEventListener("error", () => {
        setSseConnected(false);
        source?.close();
        source = null;
        if (cancelled) return;
        const delay = Math.min(30_000, 1_000 * 2 ** Math.min(retries, 5));
        retries += 1;
        window.setTimeout(connect, delay);
      });
    };

    connect();

    return () => {
      cancelled = true;
      setSseConnected(false);
      source?.close();
    };
  }, [filterKey, makePostMarker, mergePosts]);

  return {
    posts,
    loading,
    hasMore,
    loadMore,
    reset,
    sseConnected,
  };
}

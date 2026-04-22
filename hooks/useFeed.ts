"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { fetchFeed, type FeedPost } from "@/lib/api";

const POLL_INTERVAL_MS = 3 * 60 * 1000; // 3 minutes
const PAGE_SIZE = 20;

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
  const latestIdRef = useRef<string | null>(null);
  const loadingRef = useRef(false);
  const hasMoreRef = useRef(true);
  const pageRef = useRef(1);
  const filterRef = useRef<UseFeedFilter | undefined>(filter);
  const [sseConnected, setSseConnected] = useState(false);

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

  const loadMore = async () => {
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

      setPosts((prev) => {
        const merged = [...prev, ...data.posts];
        merged.sort((a, b) => {
          const aTs = Date.parse(a.created_at);
          const bTs = Date.parse(b.created_at);
          const safeATs = Number.isFinite(aTs) ? aTs : 0;
          const safeBTs = Number.isFinite(bTs) ? bTs : 0;
          return safeBTs - safeATs;
        });
        const deduped: FeedPost[] = [];
        const seen = new Set<string>();
        for (const item of merged) {
          if (seen.has(item.id)) continue;
          seen.add(item.id);
          deduped.push(item);
        }
        return deduped;
      });
      setHasMore(Boolean(data.has_more));
      setPage((prev) => prev + 1);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  };

  const reset = () => {
    setPosts([]);
    setPage(1);
    setHasMore(true);
    latestIdRef.current = null;
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

      const newest = data.posts[0]?.id ?? null;
      if (!newest || newest === latestIdRef.current) return;
      latestIdRef.current = newest;

      setPosts((prev) => {
        const existingIds = new Set(prev.map((post) => post.id));
        const trulyNew = data.posts.filter((post) => !existingIds.has(post.id));
        if (trulyNew.length === 0) return prev;
        const merged = [...trulyNew, ...prev];
        merged.sort((a, b) => {
          const aTs = Date.parse(a.created_at);
          const bTs = Date.parse(b.created_at);
          const safeATs = Number.isFinite(aTs) ? aTs : 0;
          const safeBTs = Number.isFinite(bTs) ? bTs : 0;
          return safeBTs - safeATs;
        });
        return merged;
      });
    };

    void initialLoad();
    const timer = window.setInterval(() => {
      void poll();
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [filterKey]);

  useEffect(() => {
    const usesFilter = Boolean(filterRef.current?.freshness || filterRef.current?.urgency);
    if (usesFilter) return;

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
          latestIdRef.current = post.id;
          setPosts((prev) => {
            const existingIds = new Set(prev.map((item) => item.id));
            if (existingIds.has(post.id)) return prev;
            const merged = [post, ...prev];
            merged.sort((a, b) => {
              const aTs = Date.parse(a.created_at);
              const bTs = Date.parse(b.created_at);
              const safeATs = Number.isFinite(aTs) ? aTs : 0;
              const safeBTs = Number.isFinite(bTs) ? bTs : 0;
              return safeBTs - safeATs;
            });
            return merged;
          });
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
  }, [filterKey]);

  return {
    posts,
    loading,
    hasMore,
    loadMore,
    reset,
    sseConnected,
  };
}

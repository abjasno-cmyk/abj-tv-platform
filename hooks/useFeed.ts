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

      setPosts((prev) => [...prev, ...data.posts]);
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
        return trulyNew.length > 0 ? [...trulyNew, ...prev] : prev;
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

  return {
    posts,
    loading,
    hasMore,
    loadMore,
    reset,
  };
}

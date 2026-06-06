"use client";

import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/components/auth/AuthProvider";

type ViewerVideoState = {
  savedVideoIds: Set<string>;
  watchedVideoIds: Set<string>;
  followedChannelIds: Set<string>;
  loading: boolean;
  refresh: () => Promise<void>;
  setSaved: (videoId: string, saved: boolean) => void;
};

export function useViewerVideoState(): ViewerVideoState {
  const { isAuthenticated } = useAuth();
  const [savedVideoIds, setSavedVideoIds] = useState<Set<string>>(() => new Set());
  const [watchedVideoIds, setWatchedVideoIds] = useState<Set<string>>(() => new Set());
  const [followedChannelIds, setFollowedChannelIds] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setSavedVideoIds(new Set());
      setWatchedVideoIds(new Set());
      setFollowedChannelIds(new Set());
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/viewer/video-state", { cache: "no-store" });
      const payload = (await response.json().catch(() => ({}))) as {
        savedVideoIds?: string[];
        watchedVideoIds?: string[];
        followedChannelIds?: string[];
      };
      if (!response.ok) return;
      setSavedVideoIds(new Set(payload.savedVideoIds ?? []));
      setWatchedVideoIds(new Set(payload.watchedVideoIds ?? []));
      setFollowedChannelIds(new Set(payload.followedChannelIds ?? []));
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const setSaved = useCallback((videoId: string, saved: boolean) => {
    setSavedVideoIds((prev) => {
      const next = new Set(prev);
      if (saved) next.add(videoId);
      else next.delete(videoId);
      return next;
    });
  }, []);

  return {
    savedVideoIds,
    watchedVideoIds,
    followedChannelIds,
    loading,
    refresh,
    setSaved,
  };
}

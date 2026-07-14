"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { getDictionary } from "@/lib/i18n/dictionary";
import { useLocale } from "@/lib/i18n/useLocale";

type FollowChannelButtonProps = {
  channelId: string | null;
  channelName: string;
  className?: string;
};

type FollowsResponse = {
  follows?: Array<{ channelId: string }>;
  error?: string;
};

export function FollowChannelButton({ channelId, channelName, className }: FollowChannelButtonProps) {
  const { isAuthenticated, requestAuth } = useAuth();
  const dictionary = getDictionary(useLocale());
  const [followed, setFollowed] = useState(false);
  const [loading, setLoading] = useState(false);
  const effectiveFollowed = isAuthenticated && followed;

  useEffect(() => {
    if (!isAuthenticated || !channelId) return;
    let cancelled = false;
    void fetch("/api/viewer/follows", { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json().catch(() => ({}))) as FollowsResponse;
        if (!response.ok) return;
        const isFollowed = (payload.follows ?? []).some((item) => item.channelId === channelId);
        if (!cancelled) setFollowed(isFollowed);
      })
      .catch(() => {
        // Non-critical in UI.
      });

    return () => {
      cancelled = true;
    };
  }, [channelId, isAuthenticated]);

  const toggleFollow = async () => {
    if (!channelId) return;
    setLoading(true);
    if (effectiveFollowed) {
      const response = await fetch(`/api/viewer/follows?channelId=${encodeURIComponent(channelId)}`, {
        method: "DELETE",
      });
      setLoading(false);
      if (response.ok) setFollowed(false);
      return;
    }

    const response = await fetch("/api/viewer/follows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelId }),
    });
    setLoading(false);
    if (response.ok) setFollowed(true);
  };

  return (
    <button
      type="button"
      className={className ?? `vx-save-video vx-save-video--channel${effectiveFollowed ? " is-saved" : ""}`}
      disabled={loading || !channelId}
      aria-pressed={effectiveFollowed}
      aria-label={effectiveFollowed ? dictionary.common.removeChannel : dictionary.common.saveChannel}
      title={channelId ? undefined : dictionary.common.channelUnavailable}
      onClick={() => {
        if (!channelId) return;
        if (!isAuthenticated) {
          requestAuth(() => {
            void toggleFollow();
          }, {
            reason: `${dictionary.header.authReason.default} (${channelName})`,
          });
          return;
        }
        void toggleFollow();
      }}
    >
      <span aria-hidden="true">{effectiveFollowed ? "★" : "☆"}</span>
      <span className="vx-save-video-label">
        {loading ? "…" : effectiveFollowed ? dictionary.common.channelSaved : dictionary.common.saveChannel}
      </span>
    </button>
  );
}

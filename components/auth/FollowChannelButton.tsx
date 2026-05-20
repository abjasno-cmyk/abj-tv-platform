"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth/AuthProvider";

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
  const [followed, setFollowed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !channelId) {
      setFollowed(false);
      return;
    }
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
    if (followed) {
      const response = await fetch(`/api/viewer/follows?channelId=${encodeURIComponent(channelId)}`, { method: "DELETE" });
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
      className={
        className ??
        `inline-flex min-h-9 items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] transition ${
          followed
            ? "border-[#FF6A00] bg-[rgba(255,106,0,0.15)] text-[#B04A00]"
            : "border-[rgba(17,17,17,0.2)] bg-white text-abj-text2 hover:border-[#FF6A00]/45 hover:text-abj-text1"
        }`
      }
      disabled={loading || !channelId}
      onClick={() =>
        requestAuth(
          () => {
            void toggleFollow();
          },
          {
            reason: `Přihlaste se zdarma a uložte si kanál ${channelName} mezi oblíbené.`,
          }
        )
      }
      title={channelId ? undefined : "Kanál zatím nemá interní identifikátor"}
    >
      {loading ? "..." : followed ? "★ Oblíbený" : "☆ Uložit"}
    </button>
  );
}

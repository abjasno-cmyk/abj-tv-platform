"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth/AuthProvider";

type LikeButtonProps = {
  entityType: string;
  entityId: string;
  className?: string;
};

type LikeStateResponse = {
  liked?: boolean;
  error?: string;
};

export function LikeButton({ entityType, entityId, className }: LikeButtonProps) {
  const { isAuthenticated, requestAuth } = useAuth();
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!entityType || !entityId || !isAuthenticated) {
      setLiked(false);
      return;
    }

    let cancelled = false;
    setError(null);
    void fetch(`/api/viewer/likes?entityType=${encodeURIComponent(entityType)}&entityId=${encodeURIComponent(entityId)}`, {
      cache: "no-store",
    })
      .then(async (response) => {
        const payload = (await response.json().catch(() => ({}))) as LikeStateResponse;
        if (!response.ok) throw new Error(payload.error ?? "Nepodařilo se načíst stav lajku.");
        if (!cancelled) setLiked(payload.liked === true);
      })
      .catch((loadError) => {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : "Nepodařilo se načíst stav lajku.");
      });

    return () => {
      cancelled = true;
    };
  }, [entityId, entityType, isAuthenticated]);

  const toggleLike = async () => {
    setLoading(true);
    setError(null);
    const method = liked ? "DELETE" : "POST";
    const url =
      method === "DELETE"
        ? `/api/viewer/likes?entityType=${encodeURIComponent(entityType)}&entityId=${encodeURIComponent(entityId)}`
        : "/api/viewer/likes";
    const response = await fetch(url, {
      method,
      headers: method === "POST" ? { "Content-Type": "application/json" } : undefined,
      body:
        method === "POST"
          ? JSON.stringify({
              entityType,
              entityId,
            })
          : undefined,
    });
    const payload = (await response.json().catch(() => ({}))) as { liked?: boolean; error?: string };
    setLoading(false);
    if (!response.ok) {
      setError(payload.error ?? "Lajk se nepodařilo uložit.");
      return;
    }
    setLiked(payload.liked === true);
  };

  return (
    <div className="space-y-1">
      <button
        type="button"
        className={
          className ??
          `inline-flex min-h-10 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
            liked
              ? "border-[#FF6A00] bg-[rgba(255,106,0,0.15)] text-[#B04A00]"
              : "border-[rgba(17,17,17,0.2)] bg-white text-abj-text1 hover:border-[#FF6A00]/45 hover:bg-[rgba(255,106,0,0.06)]"
          }`
        }
        disabled={loading}
        onClick={() => {
          requestAuth(
            () => {
              void toggleLike();
            },
            {
              reason: "Komentujte, lajkujte a pokračujte tam, kde jste skončili.",
            }
          );
        }}
      >
        <span aria-hidden="true">{liked ? "♥" : "♡"}</span>
        {loading ? "Ukládám..." : liked ? "Líbí se vám to" : "Líbí se mi"}
      </button>
      {error ? <p className="text-xs text-[#D14A2A]">{error}</p> : null}
    </div>
  );
}

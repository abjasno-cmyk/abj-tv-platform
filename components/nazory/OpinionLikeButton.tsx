"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { VIEWER_ENTITY_OPINION } from "@/lib/viewer/entities";

type OpinionLikeButtonProps = {
  articleId: string;
  className?: string;
};

export function OpinionLikeButton({ articleId, className }: OpinionLikeButtonProps) {
  const { isAuthenticated, requestAuth } = useAuth();
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    void fetch(
      `/api/viewer/likes?entityType=${encodeURIComponent(VIEWER_ENTITY_OPINION)}&entityId=${encodeURIComponent(articleId)}`,
      { cache: "no-store" },
    )
      .then(async (response) => {
        const payload = (await response.json()) as { liked?: boolean };
        if (!cancelled && response.ok) setLiked(payload.liked === true);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [articleId, isAuthenticated]);

  const toggleLike = async () => {
    setLoading(true);
    setError(null);
    const method = liked ? "DELETE" : "POST";
    const url =
      method === "DELETE"
        ? `/api/viewer/likes?entityType=${encodeURIComponent(VIEWER_ENTITY_OPINION)}&entityId=${encodeURIComponent(articleId)}`
        : "/api/viewer/likes";
    const response = await fetch(url, {
      method,
      headers: method === "POST" ? { "Content-Type": "application/json" } : undefined,
      body:
        method === "POST"
          ? JSON.stringify({ entityType: VIEWER_ENTITY_OPINION, entityId: articleId })
          : undefined,
    });
    const payload = (await response.json()) as { liked?: boolean; error?: string };
    setLoading(false);
    if (!response.ok) {
      setError(payload.error ?? "Srdíčko se nepodařilo uložit.");
      return;
    }
    setLiked(payload.liked === true);
  };

  return (
    <span className="nazory-like-wrap">
      <button
        type="button"
        className={className ?? `nazory-btn nazory-btn-like${liked ? " is-liked" : ""}`}
        disabled={loading}
        aria-pressed={liked}
        onClick={() => {
          if (!isAuthenticated) {
            requestAuth(() => {
              void toggleLike();
            }, { reason: "Přihlaste se a dejte článku srdíčko." });
            return;
          }
          void toggleLike();
        }}
      >
        <span aria-hidden="true">{liked ? "♥" : "♡"}</span>
        {loading ? "…" : liked ? "Líbí se mi" : "Srdíčko"}
      </button>
      {error ? <span className="nazory-error nazory-like-error">{error}</span> : null}
    </span>
  );
}

"use client";

import { useState } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { VIEWER_COMMENT_LIKE_ENTITY } from "@/lib/viewer/comments";

type CommentLikeButtonProps = {
  commentId: string;
  initialCount: number;
  initialLiked: boolean;
  onChange?: (next: { likeCount: number; likedByMe: boolean }) => void;
};

export function CommentLikeButton({
  commentId,
  initialCount,
  initialLiked,
  onChange,
}: CommentLikeButtonProps) {
  const { isAuthenticated, requestAuth } = useAuth();
  const [likeCount, setLikeCount] = useState(initialCount);
  const [likedByMe, setLikedByMe] = useState(initialLiked);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    if (!isAuthenticated) {
      requestAuth(() => undefined, { reason: "Pro reakci na komentář se přihlaste zdarma." });
      return;
    }

    setLoading(true);
    const nextLiked = !likedByMe;
    const nextCount = Math.max(0, likeCount + (nextLiked ? 1 : -1));
    setLikedByMe(nextLiked);
    setLikeCount(nextCount);

    const method = nextLiked ? "POST" : "DELETE";
    const url =
      method === "DELETE"
        ? `/api/viewer/likes?entityType=${encodeURIComponent(VIEWER_COMMENT_LIKE_ENTITY)}&entityId=${encodeURIComponent(commentId)}`
        : "/api/viewer/likes";
    const response = await fetch(url, {
      method,
      headers: method === "POST" ? { "Content-Type": "application/json" } : undefined,
      credentials: "include",
      body:
        method === "POST"
          ? JSON.stringify({
              entityType: VIEWER_COMMENT_LIKE_ENTITY,
              entityId: commentId,
            })
          : undefined,
    });

    setLoading(false);
    if (!response.ok) {
      setLikedByMe(!nextLiked);
      setLikeCount(likeCount);
      return;
    }

    onChange?.({ likeCount: nextCount, likedByMe: nextLiked });
  };

  return (
    <button
      type="button"
      className={`vx-comment-like${likedByMe ? " is-liked" : ""}`}
      onClick={() => {
        void toggle();
      }}
      disabled={loading}
      aria-pressed={likedByMe}
      aria-label={likedByMe ? "Odebrat reakci srdcem" : "Reagovat srdcem"}
    >
      <span className="vx-comment-like-icon" aria-hidden="true">
        {likedByMe ? "♥" : "♡"}
      </span>
      {likeCount > 0 ? <span className="vx-comment-like-count">{likeCount}</span> : null}
    </button>
  );
}

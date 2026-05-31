"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  createAbjXComment,
  fetchAbjXComments,
  fetchAbjXStats,
  likePost,
  sendAbjXReaction,
  sendAbjXShare,
  type AbjXComment,
  type AbjXSocialStats,
} from "@/lib/api";
import { useAuth } from "@/components/auth/AuthProvider";
import type { VKostceFeedItem } from "@/components/v-kostce/v-kostce-feed-utils";

const EMPTY_STATS: AbjXSocialStats = {
  reactionCount: 0,
  commentCount: 0,
  shareCount: 0,
  reactedByMe: false,
};
const LOCAL_SOCIAL_KEY = "abjx_social_by_post_v1";
const LOCAL_WALL_KEY = "abjx_wall_comments_v1";

function buildSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `abjx-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readLocalJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeLocalJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage errors.
  }
}

function mergeComments(existing: AbjXComment[], incoming: AbjXComment[]): AbjXComment[] {
  const byId = new Map<string, AbjXComment>();
  for (const comment of existing) {
    byId.set(comment.id, comment);
  }
  for (const comment of incoming) {
    byId.set(comment.id, comment);
  }
  return [...byId.values()].sort((a, b) => {
    const aTs = Date.parse(a.createdAt);
    const bTs = Date.parse(b.createdAt);
    if (!Number.isFinite(aTs) && !Number.isFinite(bTs)) return 0;
    if (!Number.isFinite(aTs)) return -1;
    if (!Number.isFinite(bTs)) return 1;
    return aTs - bTs;
  });
}

export function useVKostceInteractions(items: VKostceFeedItem[]) {
  const { isAuthenticated, requestAuth } = useAuth();
  const localCommentCounterRef = useRef(0);
  const [sessionId] = useState(() => {
    if (typeof window === "undefined") return "";
    const key = "abjx_session_id";
    let resolved = window.localStorage.getItem(key);
    if (!resolved) {
      resolved = buildSessionId();
      window.localStorage.setItem(key, resolved);
    }
    return resolved;
  });
  const [socialByPost, setSocialByPost] = useState<Record<string, AbjXSocialStats>>(() =>
    readLocalJson<Record<string, AbjXSocialStats>>(LOCAL_SOCIAL_KEY, {})
  );
  const [reactingByPost, setReactingByPost] = useState<Record<string, boolean>>({});
  const [shareHintByPost, setShareHintByPost] = useState<Record<string, string>>({});
  const [wallOpenByPost, setWallOpenByPost] = useState<Record<string, boolean>>({});
  const [wallDraftByPost, setWallDraftByPost] = useState<Record<string, string>>({});
  const [wallCommentsByPost, setWallCommentsByPost] = useState<Record<string, AbjXComment[]>>(() =>
    readLocalJson<Record<string, AbjXComment[]>>(LOCAL_WALL_KEY, {})
  );
  const [wallLoadingByPost, setWallLoadingByPost] = useState<Record<string, boolean>>({});
  const [wallErrorByPost, setWallErrorByPost] = useState<Record<string, string>>({});
  const [wallSubmittingByPost, setWallSubmittingByPost] = useState<Record<string, boolean>>({});

  const postIdsKey = useMemo(() => items.map((item) => item.id).join("|"), [items]);

  useEffect(() => {
    writeLocalJson(LOCAL_SOCIAL_KEY, socialByPost);
  }, [socialByPost]);

  useEffect(() => {
    writeLocalJson(LOCAL_WALL_KEY, wallCommentsByPost);
  }, [wallCommentsByPost]);

  useEffect(() => {
    const postIds = items.map((item) => item.id).filter((id) => id.length > 0);
    if (postIds.length === 0 || !sessionId) return;

    let cancelled = false;
    void fetchAbjXStats({ postIds, sessionId }).then((stats) => {
      if (cancelled || !stats) return;
      setSocialByPost((prev) => {
        const next: Record<string, AbjXSocialStats> = { ...prev };
        for (const postId of postIds) {
          next[postId] = stats[postId] ?? prev[postId] ?? EMPTY_STATS;
        }
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [postIdsKey, sessionId, items]);

  const loadWallComments = async (postId: string) => {
    if (!postId || wallLoadingByPost[postId]) return;
    setWallLoadingByPost((prev) => ({ ...prev, [postId]: true }));
    setWallErrorByPost((prev) => ({ ...prev, [postId]: "" }));
    const comments = await fetchAbjXComments(postId);
    if (!comments) {
      setWallErrorByPost((prev) => ({ ...prev, [postId]: "Komentáře se nepodařilo načíst." }));
      setWallLoadingByPost((prev) => ({ ...prev, [postId]: false }));
      return;
    }
    setWallCommentsByPost((prev) => ({
      ...prev,
      [postId]: mergeComments(prev[postId] ?? [], comments),
    }));
    setWallLoadingByPost((prev) => ({ ...prev, [postId]: false }));
  };

  const handleReact = async (item: VKostceFeedItem) => {
    if (!isAuthenticated) {
      requestAuth(() => void handleReact(item), {
        reason: "Přihlaste se zdarma a reagujte na příspěvky v sekci V kostce.",
      });
      return;
    }
    if (!item.id || !item.videoId || !sessionId || reactingByPost[item.id]) return;
    const current = socialByPost[item.id] ?? EMPTY_STATS;
    if (current.reactedByMe) return;

    setReactingByPost((prev) => ({ ...prev, [item.id]: true }));
    const persisted = await sendAbjXReaction({ postId: item.id, videoId: item.videoId, sessionId });
    if (persisted) {
      setSocialByPost((prev) => {
        const base = prev[item.id] ?? EMPTY_STATS;
        return {
          ...prev,
          [item.id]: { ...base, reactionCount: persisted.reactionCount, reactedByMe: true },
        };
      });
      if (persisted.reactedNow) void likePost(item.id);
    } else {
      const ok = await likePost(item.id);
      if (ok) {
        setSocialByPost((prev) => {
          const base = prev[item.id] ?? EMPTY_STATS;
          return {
            ...prev,
            [item.id]: { ...base, reactionCount: base.reactionCount + 1, reactedByMe: true },
          };
        });
      }
    }
    setReactingByPost((prev) => ({ ...prev, [item.id]: false }));
  };

  const handleShare = async (item: VKostceFeedItem) => {
    if (!isAuthenticated) {
      requestAuth(() => {}, {
        reason: "Přihlaste se zdarma a sdílejte příspěvky ze sekce V kostce.",
      });
      return;
    }
    if (!item.videoId || typeof window === "undefined") return;
    const url = `${window.location.origin}/live?videoId=${encodeURIComponent(item.videoId)}`;
    const text = `${item.headline}\n${url}`;

    let sharePerformed = false;
    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({ title: item.headline, text: item.lead || item.headline, url });
        setShareHintByPost((prev) => ({ ...prev, [item.id]: "Sdíleno." }));
        sharePerformed = true;
      } else if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setShareHintByPost((prev) => ({ ...prev, [item.id]: "Odkaz zkopírován." }));
        sharePerformed = true;
      } else {
        setShareHintByPost((prev) => ({ ...prev, [item.id]: "Sdílení není v tomto prohlížeči dostupné." }));
      }
    } catch {
      setShareHintByPost((prev) => ({ ...prev, [item.id]: "Sdílení bylo zrušeno." }));
    }

    if (!sharePerformed || !sessionId) return;
    const persisted = await sendAbjXShare({ postId: item.id, videoId: item.videoId, sessionId });
    if (!persisted) return;
    setSocialByPost((prev) => {
      const base = prev[item.id] ?? EMPTY_STATS;
      return { ...prev, [item.id]: { ...base, shareCount: persisted.shareCount } };
    });
  };

  const toggleComments = (item: VKostceFeedItem) => {
    if (!isAuthenticated) {
      requestAuth(
        () => {
          setWallOpenByPost((prev) => ({ ...prev, [item.id]: true }));
          if (wallCommentsByPost[item.id] === undefined) void loadWallComments(item.id);
        },
        { reason: "Zapojte se do diskuse. Přihlášení je zdarma." }
      );
      return;
    }
    const nextOpen = !wallOpenByPost[item.id];
    setWallOpenByPost((prev) => ({ ...prev, [item.id]: nextOpen }));
    if (nextOpen && wallCommentsByPost[item.id] === undefined) void loadWallComments(item.id);
  };

  const addWallComment = async (item: VKostceFeedItem) => {
    if (!isAuthenticated) {
      requestAuth(() => void addWallComment(item), { reason: "Zapojte se do diskuse. Přihlášení je zdarma." });
      return;
    }
    const nextText = wallDraftByPost[item.id]?.trim();
    if (!nextText || !sessionId) return;
    setWallSubmittingByPost((prev) => ({ ...prev, [item.id]: true }));

    const created = await createAbjXComment({
      postId: item.id,
      videoId: item.videoId,
      body: nextText,
      sessionId,
    });

    if (created) {
      setWallCommentsByPost((prev) => ({
        ...prev,
        [item.id]: [...(prev[item.id] ?? []), created.comment],
      }));
      setSocialByPost((prev) => {
        const base = prev[item.id] ?? EMPTY_STATS;
        return { ...prev, [item.id]: { ...base, commentCount: created.commentCount } };
      });
      setWallErrorByPost((prev) => ({ ...prev, [item.id]: "" }));
    } else {
      localCommentCounterRef.current += 1;
      const localComment: AbjXComment = {
        id: `local-${item.id}-${sessionId}-${localCommentCounterRef.current}`,
        postId: item.id,
        authorName: "Vy",
        body: nextText,
        createdAt: new Date().toISOString(),
      };
      setWallCommentsByPost((prev) => ({
        ...prev,
        [item.id]: [...(prev[item.id] ?? []), localComment],
      }));
      setSocialByPost((prev) => {
        const base = prev[item.id] ?? EMPTY_STATS;
        return { ...prev, [item.id]: { ...base, commentCount: base.commentCount + 1 } };
      });
      setWallErrorByPost((prev) => ({ ...prev, [item.id]: "Komentář uložen jen lokálně (backend nedostupný)." }));
    }

    setWallDraftByPost((prev) => ({ ...prev, [item.id]: "" }));
    setWallOpenByPost((prev) => ({ ...prev, [item.id]: true }));
    setWallSubmittingByPost((prev) => ({ ...prev, [item.id]: false }));
  };

  return {
    isAuthenticated,
    socialByPost,
    reactingByPost,
    shareHintByPost,
    wallOpenByPost,
    wallDraftByPost,
    wallCommentsByPost,
    wallLoadingByPost,
    wallErrorByPost,
    wallSubmittingByPost,
    setWallDraftByPost,
    handleReact,
    handleShare,
    toggleComments,
    addWallComment,
  };
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useFeed } from "@/hooks/useFeed";
import {
  createAbjXComment,
  fetchAbjXComments,
  fetchAbjXStats,
  likePost,
  sendAbjXReaction,
  sendAbjXShare,
  trackView,
  type AbjXComment,
  type AbjXSocialStats,
  type FeedPost,
} from "@/lib/api";

type FeedItem = {
  id: string;
  channel: string;
  headline: string;
  what: string;
  why: string | null;
  impact: string | null;
  freshness: "breaking" | "today" | "week" | "evergreen";
  urgency: 1 | 2 | 3;
  createdAt: string;
  displayAt: string;
  videoId: string;
  likeCount: number;
  commentCount: number;
};

const EMPTY_STATS: AbjXSocialStats = {
  reactionCount: 0,
  commentCount: 0,
  shareCount: 0,
  reactedByMe: false,
};

function getPostTimestamp(post: FeedPost): number {
  const editorialAt = (post as FeedPost & { editorial_at?: string | null }).editorial_at;
  const updatedAt = (post as FeedPost & { updated_at?: string | null }).updated_at;
  const candidates = [editorialAt, updatedAt, post.created_at, post.video_published_at];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const parsed = Date.parse(candidate);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function toItems(posts: FeedPost[]): FeedItem[] {
  return posts
    .map((post) => ({
      id: post.id,
      channel: post.channel_name || "Neznámý kanál",
      headline: post.headline?.trim() || post.what?.trim() || "Bez titulku",
      what: post.what?.trim() || "",
      why: post.why?.trim() || null,
      impact: post.impact?.trim() || null,
      freshness: post.freshness,
      urgency: post.urgency,
      createdAt: post.created_at,
      displayAt:
        (post as FeedPost & { editorial_at?: string | null }).editorial_at ??
        (post as FeedPost & { updated_at?: string | null }).updated_at ??
        post.created_at,
      videoId: post.video_id,
      likeCount: Number.isFinite(post.like_count) ? post.like_count : 0,
      commentCount: Number.isFinite(post.comment_count) ? post.comment_count : 0,
    }))
    .sort((a, b) => {
      const sourceA = posts.find((post) => post.id === a.id) ?? null;
      const sourceB = posts.find((post) => post.id === b.id) ?? null;
      const aTs = sourceA ? getPostTimestamp(sourceA) : new Date(a.displayAt).getTime();
      const bTs = sourceB ? getPostTimestamp(sourceB) : new Date(b.displayAt).getTime();
      if (!Number.isFinite(aTs) && !Number.isFinite(bTs)) return 0;
      if (!Number.isFinite(aTs)) return 1;
      if (!Number.isFinite(bTs)) return -1;
      return bTs - aTs;
    });
}

function freshnessClass(value: FeedItem["freshness"]): string {
  if (value === "breaking") return "border-[#FF6A00] bg-[rgba(255,106,0,0.2)] text-[#FFE6D1]";
  if (value === "today") return "border-[#4F79B8] bg-[rgba(79,121,184,0.2)] text-[#D8E4F3]";
  if (value === "week") return "border-[rgba(154,163,178,0.5)] bg-[rgba(154,163,178,0.14)] text-[#D2D8E2]";
  return "border-[#4A7E61] bg-[rgba(74,126,97,0.2)] text-[#D5EBDD]";
}

function formatCreatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "čas neuveden";
  return new Intl.DateTimeFormat("cs-CZ", {
    timeZone: "Europe/Prague",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function formatWallCommentAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "teď";
  return new Intl.DateTimeFormat("cs-CZ", {
    timeZone: "Europe/Prague",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function buildSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `abjx-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function AbjXClient() {
  const { posts, loading, hasMore, loadMore } = useFeed();
  const router = useRouter();
  const items = useMemo(() => toItems(posts), [posts]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [socialByPost, setSocialByPost] = useState<Record<string, AbjXSocialStats>>({});
  const [reactingByPost, setReactingByPost] = useState<Record<string, boolean>>({});
  const [shareHintByPost, setShareHintByPost] = useState<Record<string, string>>({});
  const [wallOpenByPost, setWallOpenByPost] = useState<Record<string, boolean>>({});
  const [wallDraftByPost, setWallDraftByPost] = useState<Record<string, string>>({});
  const [wallCommentsByPost, setWallCommentsByPost] = useState<Record<string, AbjXComment[]>>({});
  const [wallLoadingByPost, setWallLoadingByPost] = useState<Record<string, boolean>>({});
  const [wallErrorByPost, setWallErrorByPost] = useState<Record<string, string>>({});
  const [wallSubmittingByPost, setWallSubmittingByPost] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = "abjx_session_id";
    let resolved = window.localStorage.getItem(key);
    if (!resolved) {
      resolved = buildSessionId();
      window.localStorage.setItem(key, resolved);
    }
    setSessionId(resolved);
  }, []);

  useEffect(() => {
    const postIds = items.map((item) => item.id).filter((id) => id.length > 0);
    if (postIds.length === 0) {
      setSocialByPost({});
      return;
    }

    let cancelled = false;
    void fetchAbjXStats({
      postIds,
      sessionId,
    }).then((stats) => {
      if (cancelled || !stats) return;
      setSocialByPost((prev) => {
        const next: Record<string, AbjXSocialStats> = {};
        for (const postId of postIds) {
          next[postId] = stats[postId] ?? prev[postId] ?? EMPTY_STATS;
        }
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [items, sessionId]);

  const navigateToVideo = (item: FeedItem) => {
    if (!item.videoId) return;
    void trackView(item.id);
    router.push(`/live?videoId=${encodeURIComponent(item.videoId)}`);
  };

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
    setWallCommentsByPost((prev) => ({ ...prev, [postId]: comments }));
    setWallLoadingByPost((prev) => ({ ...prev, [postId]: false }));
  };

  const handleReact = async (item: FeedItem) => {
    if (!item.id || !item.videoId || !sessionId || reactingByPost[item.id]) return;
    const current = socialByPost[item.id] ?? EMPTY_STATS;
    if (current.reactedByMe) {
      return;
    }

    setReactingByPost((prev) => ({ ...prev, [item.id]: true }));
    const persisted = await sendAbjXReaction({
      postId: item.id,
      videoId: item.videoId,
      sessionId,
    });
    if (persisted) {
      setSocialByPost((prev) => {
        const base = prev[item.id] ?? EMPTY_STATS;
        return {
          ...prev,
          [item.id]: {
            ...base,
            reactionCount: persisted.reactionCount,
            reactedByMe: true,
          },
        };
      });
      if (persisted.reactedNow) {
        void likePost(item.id);
      }
    } else {
      const ok = await likePost(item.id);
      if (ok) {
        setSocialByPost((prev) => {
          const base = prev[item.id] ?? EMPTY_STATS;
          return {
            ...prev,
            [item.id]: {
              ...base,
              reactionCount: base.reactionCount + 1,
              reactedByMe: true,
            },
          };
        });
      }
    }
    setReactingByPost((prev) => ({ ...prev, [item.id]: false }));
  };

  const handleShare = async (item: FeedItem) => {
    if (!item.videoId || typeof window === "undefined") return;
    const url = `${window.location.origin}/live?videoId=${encodeURIComponent(item.videoId)}`;
    const text = `${item.headline}\n${url}`;

    let sharePerformed = false;
    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({
          title: item.headline,
          text: item.what,
          url,
        });
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

    if (!sharePerformed) return;
    const persisted = await sendAbjXShare({
      postId: item.id,
      videoId: item.videoId,
      sessionId,
    });
    if (!persisted) return;
    setSocialByPost((prev) => {
      const base = prev[item.id] ?? EMPTY_STATS;
      return {
        ...prev,
        [item.id]: {
          ...base,
          shareCount: persisted.shareCount,
        },
      };
    });
  };

  const addWallComment = async (item: FeedItem) => {
    const nextText = wallDraftByPost[item.id]?.trim();
    if (!nextText) return;
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
        return {
          ...prev,
          [item.id]: {
            ...base,
            commentCount: created.commentCount,
          },
        };
      });
      setWallErrorByPost((prev) => ({ ...prev, [item.id]: "" }));
    } else {
      // Keep wall usable even when backend is temporarily unavailable.
      const localComment: AbjXComment = {
        id: `local-${item.id}-${Date.now()}`,
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
        return {
          ...prev,
          [item.id]: {
            ...base,
            commentCount: base.commentCount + 1,
          },
        };
      });
      setWallErrorByPost((prev) => ({ ...prev, [item.id]: "Komentář uložen jen lokálně (backend nedostupný)." }));
    }

    setWallDraftByPost((prev) => ({ ...prev, [item.id]: "" }));
    setWallOpenByPost((prev) => ({ ...prev, [item.id]: true }));
    setWallSubmittingByPost((prev) => ({ ...prev, [item.id]: false }));
  };

  return (
    <section className="mx-auto w-full max-w-4xl space-y-6 px-3 py-6 sm:px-5">
      <header className="space-y-2">
        <p className="text-[11px] uppercase tracking-[0.14em] text-abj-text2">ABJ X</p>
        <h1 className="font-[var(--font-serif)] text-3xl font-semibold text-abj-text1">Textové zprávy</h1>
        <p className="text-sm text-abj-text2">Krátké zprávy a souvislosti napříč ABJ sítí</p>
      </header>

      {items.length === 0 && !loading ? (
        <div className="rounded-xl border border-[var(--abj-gold-dim)] bg-abj-panel p-6 text-sm text-abj-text2">
          Zatím žádné textové zprávy.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const social = socialByPost[item.id] ?? EMPTY_STATS;
            const reacted = social.reactedByMe;
            const wallOpen = Boolean(wallOpenByPost[item.id]);
            const wallComments = wallCommentsByPost[item.id] ?? [];
            const shareHint = shareHintByPost[item.id];
            const shownReactionCount = Math.max(0, item.likeCount + social.reactionCount);
            const shownCommentCount = Math.max(0, item.commentCount + social.commentCount);
            const shownShareCount = Math.max(0, social.shareCount);
            const videoAvailable = Boolean(item.videoId);
            const isReacting = Boolean(reactingByPost[item.id]);
            const commentsLoading = Boolean(wallLoadingByPost[item.id]);
            const commentsSubmitting = Boolean(wallSubmittingByPost[item.id]);
            const wallError = wallErrorByPost[item.id];

            return (
              <article
                key={item.id}
                className={`rounded-xl border border-[var(--abj-gold-dim)] bg-abj-panel p-3 transition-colors sm:p-4 ${
                  videoAvailable ? "cursor-pointer hover:border-abj-gold" : ""
                }`}
                role={videoAvailable ? "link" : undefined}
                tabIndex={videoAvailable ? 0 : undefined}
                onClick={() => navigateToVideo(item)}
                onKeyDown={(event) => {
                  if (!videoAvailable) return;
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  navigateToVideo(item);
                }}
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  {item.urgency >= 3 ? (
                    <span className="rounded-full bg-[#FF6A00] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-white">
                      BREAKING
                    </span>
                  ) : null}
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] ${freshnessClass(item.freshness)}`}
                  >
                    {item.freshness}
                  </span>
                  <span className="text-[11px] uppercase tracking-[0.08em] text-abj-text2">{item.channel}</span>
                  <span className="text-[11px] text-abj-text2">{formatCreatedAt(item.displayAt)}</span>
                  {videoAvailable ? (
                    <span className="ml-auto text-[11px] font-semibold uppercase tracking-[0.08em] text-abj-gold">
                      Otevřít video
                    </span>
                  ) : null}
                </div>

                <h2 className="text-base font-semibold text-abj-text1 sm:text-lg">{item.headline}</h2>
                <p className="mt-1 text-sm text-abj-text1">{item.what}</p>
                {item.why ? <p className="mt-1 text-sm text-abj-text2">{item.why}</p> : null}
                {item.impact ? <p className="mt-1 text-sm font-medium text-abj-gold">{item.impact}</p> : null}

                <div
                  className="mt-3 flex flex-wrap items-center gap-2 border-t border-[var(--abj-gold-dim)] pt-3"
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  <button
                    type="button"
                    className={`rounded-lg border px-2.5 py-1 text-xs uppercase tracking-[0.08em] ${
                      reacted
                        ? "border-abj-gold bg-[rgba(198,168,91,0.17)] text-abj-gold"
                        : "border-[var(--abj-gold-dim)] text-abj-text2 hover:text-abj-text1"
                    }`}
                    disabled={reacted || isReacting}
                    onClick={() => {
                      void handleReact(item);
                    }}
                  >
                    {reacted ? `Reagováno (${shownReactionCount})` : isReacting ? "Ukládám..." : `Reagovat (${shownReactionCount})`}
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-[var(--abj-gold-dim)] px-2.5 py-1 text-xs uppercase tracking-[0.08em] text-abj-text2 hover:text-abj-text1"
                    onClick={() => {
                      const nextOpen = !wallOpen;
                      setWallOpenByPost((prev) => ({ ...prev, [item.id]: nextOpen }));
                      if (nextOpen && wallCommentsByPost[item.id] === undefined) {
                        void loadWallComments(item.id);
                      }
                    }}
                  >
                    Komentáře ({shownCommentCount})
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-[var(--abj-gold-dim)] px-2.5 py-1 text-xs uppercase tracking-[0.08em] text-abj-text2 hover:text-abj-text1"
                    onClick={() => {
                      void handleShare(item);
                    }}
                  >
                    Sdílet ({shownShareCount})
                  </button>
                  {shareHint ? <span className="text-xs text-abj-text2">{shareHint}</span> : null}
                </div>

                {wallOpen ? (
                  <div
                    className="mt-3 rounded-lg border border-[var(--abj-gold-dim)] bg-[rgba(9,17,28,0.35)] p-3"
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    <h3 className="text-xs uppercase tracking-[0.1em] text-abj-text2">Zeď komentářů</h3>
                    <div className="mt-2 max-h-52 space-y-2 overflow-y-auto pr-1">
                      {commentsLoading ? <p className="text-sm text-abj-text2">Načítám komentáře…</p> : null}
                      {!commentsLoading && wallComments.length === 0 ? (
                        <p className="text-sm text-abj-text2">Zatím bez komentářů. Napište první.</p>
                      ) : (
                        wallComments.map((comment) => (
                          <article key={comment.id} className="rounded-md border border-white/10 bg-abj-panel px-2.5 py-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold text-abj-gold">{comment.authorName}</span>
                              <span className="text-[11px] text-abj-text2">{formatWallCommentAt(comment.createdAt)}</span>
                            </div>
                            <p className="mt-1 text-sm text-abj-text1">{comment.body}</p>
                          </article>
                        ))
                      )}
                    </div>
                    {wallError ? <p className="mt-2 text-xs text-abj-text2">{wallError}</p> : null}

                    <div className="mt-3 flex items-end gap-2">
                      <textarea
                        value={wallDraftByPost[item.id] ?? ""}
                        onChange={(event) => {
                          const nextValue = event.target.value;
                          setWallDraftByPost((prev) => ({ ...prev, [item.id]: nextValue }));
                        }}
                        rows={2}
                        placeholder="Napište komentář..."
                        className="min-h-[56px] flex-1 resize-y rounded-md border border-[var(--abj-gold-dim)] bg-abj-panel px-2 py-1.5 text-sm text-abj-text1 outline-none placeholder:text-abj-text2"
                      />
                      <button
                        type="button"
                        disabled={commentsSubmitting}
                        className="rounded-md border border-[var(--abj-gold-dim)] px-3 py-1.5 text-xs uppercase tracking-[0.08em] text-abj-text2 hover:text-abj-text1"
                        onClick={() => {
                          void addWallComment(item);
                        }}
                      >
                        {commentsSubmitting ? "Ukládám..." : "Přidat"}
                      </button>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}

      {hasMore ? (
        <div className="flex justify-center">
          <button
            type="button"
            className="rounded-lg border border-[var(--abj-gold-dim)] bg-abj-panel px-4 py-2 text-xs uppercase tracking-[0.08em] text-abj-text2 hover:text-abj-text1"
            onClick={() => {
              void loadMore();
            }}
          >
            {loading ? "Načítám..." : "Načíst další"}
          </button>
        </div>
      ) : null}
    </section>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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
import { useAuth } from "@/components/auth/AuthProvider";
import { SectionLabel } from "@/components/abj/SectionLabel";
import { PlayMark, ArrowRight, HeartMark } from "@/components/abj/verox-icons";

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
const LOCAL_SOCIAL_KEY = "abjx_social_by_post_v1";
const LOCAL_WALL_KEY = "abjx_wall_comments_v1";

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
  if (value === "breaking") return "border-verox-orange bg-[rgba(243,112,33,0.12)] text-verox-orangeText";
  if (value === "today") return "border-verox-ink/30 bg-[rgba(23,20,17,0.06)] text-verox-ink";
  if (value === "week") return "border-verox-line bg-[rgba(23,20,17,0.04)] text-verox-charcoal";
  return "border-verox-line bg-[rgba(23,20,17,0.03)] text-verox-gray";
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
    // Ignore storage errors (quota / privacy mode).
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

export function AbjXClient() {
  const { isAuthenticated, requestAuth } = useAuth();
  const { posts, loading, hasMore, loadMore } = useFeed();
  const localCommentCounterRef = useRef(0);
  const items = useMemo(() => toItems(posts), [posts]);
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
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [startedPlaybackByPost, setStartedPlaybackByPost] = useState<Record<string, boolean>>({});
  const [wallOpenByPost, setWallOpenByPost] = useState<Record<string, boolean>>({});
  const [wallDraftByPost, setWallDraftByPost] = useState<Record<string, string>>({});
  const [wallCommentsByPost, setWallCommentsByPost] = useState<Record<string, AbjXComment[]>>(() =>
    readLocalJson<Record<string, AbjXComment[]>>(LOCAL_WALL_KEY, {})
  );
  const [wallLoadingByPost, setWallLoadingByPost] = useState<Record<string, boolean>>({});
  const [wallErrorByPost, setWallErrorByPost] = useState<Record<string, string>>({});
  const [wallSubmittingByPost, setWallSubmittingByPost] = useState<Record<string, boolean>>({});

  useEffect(() => {
    writeLocalJson(LOCAL_SOCIAL_KEY, socialByPost);
  }, [socialByPost]);

  useEffect(() => {
    writeLocalJson(LOCAL_WALL_KEY, wallCommentsByPost);
  }, [wallCommentsByPost]);

  useEffect(() => {
    const postIds = items.map((item) => item.id).filter((id) => id.length > 0);
    if (postIds.length === 0) return;

    let cancelled = false;
    void fetchAbjXStats({
      postIds,
      sessionId,
    }).then((stats) => {
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
  }, [items, sessionId]);

  const toggleExpanded = (item: FeedItem) => {
    const nextOpen = expandedPostId !== item.id;
    setExpandedPostId(nextOpen ? item.id : null);
    if (nextOpen) {
      void trackView(item.id);
    }
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
    setWallCommentsByPost((prev) => ({
      ...prev,
      [postId]: mergeComments(prev[postId] ?? [], comments),
    }));
    setWallLoadingByPost((prev) => ({ ...prev, [postId]: false }));
  };

  const handleReact = async (item: FeedItem) => {
    if (!isAuthenticated) {
      requestAuth(
        () => {
          void handleReact(item);
        },
        {
          reason: "Přihlaste se zdarma a reagujte na příspěvky v sekci V kostce.",
        }
      );
      return;
    }
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
    if (!isAuthenticated) {
      requestAuth(
        () => {
          // Po přihlášení může uživatel sdílení opakovat.
        },
        {
          reason: "Přihlaste se zdarma a sdílejte příspěvky ze sekce V kostce.",
        }
      );
      return;
    }
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
    if (!isAuthenticated) {
      requestAuth(
        () => {
          void addWallComment(item);
        },
        {
          reason: "Zapojte se do diskuse. Přihlášení je zdarma.",
        }
      );
      return;
    }
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
    <section className="mx-auto w-full max-w-4xl space-y-8 bg-[#FBF8F2] px-3 py-8 sm:px-5">
      <header className="space-y-3">
        <SectionLabel index="(00)" title="V kostce" kicker="Den po dni" />
        <p className="max-w-[60ch] text-[0.98rem] leading-relaxed text-verox-charcoal">
          Krátce: co zaznělo v nejnovějších videích.
        </p>
      </header>

      {items.length === 0 && !loading ? (
        <div className="rounded-[14px] border border-verox-line bg-white p-6 text-sm text-verox-charcoal shadow-[0_8px_18px_rgba(17,17,17,0.10)]">
          Zatím tu nejsou žádné příspěvky.
        </div>
      ) : (
        <div className="space-y-5">
          {items.map((item) => {
            const social = socialByPost[item.id] ?? EMPTY_STATS;
            const reacted = social.reactedByMe;
            const isExpanded = expandedPostId === item.id;
            const playbackStarted = Boolean(startedPlaybackByPost[item.id]);
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
                className={`rounded-[14px] border border-verox-line bg-white p-4 shadow-[0_8px_18px_rgba(17,17,17,0.10)] transition sm:p-5 ${
                  videoAvailable ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_16px_30px_rgba(17,17,17,0.16)]" : "cursor-default"
                }`}
                role="button"
                tabIndex={0}
                onClick={() => toggleExpanded(item)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  toggleExpanded(item);
                }}
              >
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  {item.urgency >= 3 ? (
                    <span className="vx-badge">BREAKING</span>
                  ) : null}
                  <span
                    className={`rounded-full border px-2.5 py-0.5 font-[var(--vx-mono)] text-[10px] uppercase tracking-[0.14em] ${freshnessClass(item.freshness)}`}
                  >
                    {item.freshness}
                  </span>
                  <span className="vx-kicker text-verox-orangeDeep">{item.channel}</span>
                  <span className="vx-meta">{formatCreatedAt(item.displayAt)}</span>
                  {videoAvailable ? (
                    <span className="vx-action ml-auto">
                      {isExpanded ? "Skrýt video" : "Rozkliknout video"} <ArrowRight size={13} />
                    </span>
                  ) : null}
                </div>

                <h2 className="vx-display text-verox-ink" style={{ fontSize: "clamp(1.15rem, 2.2vw, 1.5rem)", lineHeight: 1.08 }}>
                  {item.headline}
                </h2>
                <p className="mt-2 text-[0.98rem] leading-relaxed text-verox-ink">{item.what}</p>
                {item.why ? <p className="mt-1.5 text-[0.95rem] leading-relaxed text-verox-charcoal">{item.why}</p> : null}
                {item.impact ? <p className="mt-1.5 text-[0.95rem] font-medium text-verox-orangeText">{item.impact}</p> : null}

                {isExpanded ? (
                  <div
                    className="mt-4 space-y-2 border-t border-verox-line pt-4"
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    {item.videoId ? (
                      <div className="overflow-hidden rounded-[14px] border border-verox-line bg-verox-ink shadow-[0_8px_18px_rgba(17,17,17,0.16)]">
                        {!playbackStarted ? (
                          <button
                            type="button"
                            className="group flex aspect-video w-full items-center justify-center bg-[radial-gradient(circle_at_center,rgba(243,112,33,0.28),rgba(23,20,17,0.92))]"
                            onClick={() => {
                              setStartedPlaybackByPost((prev) => ({ ...prev, [item.id]: true }));
                            }}
                          >
                            <span className="grid h-[58px] w-[58px] place-items-center rounded-full bg-verox-orange text-white shadow-[0_10px_24px_-8px_rgba(216,91,18,0.9)] transition-transform duration-300 group-hover:scale-110">
                              <PlayMark size={22} className="translate-x-[1px]" />
                            </span>
                          </button>
                        ) : (
                          <iframe
                            title={item.headline}
                            className="aspect-video w-full"
                            src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(item.videoId)}?rel=0&modestbranding=1&playsinline=1&autoplay=1&iv_load_policy=3`}
                            allow="autoplay; encrypted-media; picture-in-picture"
                            sandbox="allow-scripts allow-same-origin allow-presentation"
                            referrerPolicy="origin"
                            allowFullScreen
                          />
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-verox-charcoal">Video k této zprávě není dostupné.</p>
                    )}
                  </div>
                ) : null}

                <div
                  className="mt-4 flex flex-wrap items-center gap-2 border-t border-verox-line pt-4"
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  <button
                    type="button"
                    className={`vx-btn vx-btn--sm ${reacted ? "vx-btn--solid" : "vx-btn--ghost-ink"}`}
                    disabled={reacted || isReacting}
                    onClick={() => {
                      void handleReact(item);
                    }}
                  >
                    <HeartMark size={13} />
                    {reacted ? `Reagováno (${shownReactionCount})` : isReacting ? "Ukládám..." : `Reagovat (${shownReactionCount})`}
                  </button>
                  <button
                    type="button"
                    className="vx-btn vx-btn--ghost-ink vx-btn--sm"
                    onClick={() => {
                      if (!isAuthenticated) {
                        requestAuth(
                          () => {
                            setWallOpenByPost((prev) => ({ ...prev, [item.id]: true }));
                            if (wallCommentsByPost[item.id] === undefined) {
                              void loadWallComments(item.id);
                            }
                          },
                          {
                            reason: "Zapojte se do diskuse. Přihlášení je zdarma.",
                          }
                        );
                        return;
                      }
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
                    className="vx-btn vx-btn--ghost-ink vx-btn--sm"
                    onClick={() => {
                      void handleShare(item);
                    }}
                  >
                    {!isAuthenticated ? `Přihlásit pro sdílení (${shownShareCount})` : `Sdílet (${shownShareCount})`}
                  </button>
                  {videoAvailable ? (
                    <a
                      href={`/komunita?video_id=${encodeURIComponent(item.videoId)}&video_title=${encodeURIComponent(item.headline)}`}
                      className="vx-btn vx-btn--ghost-ink vx-btn--sm"
                    >
                      Do komunity
                    </a>
                  ) : (
                    <span className="vx-btn vx-btn--ghost-ink vx-btn--sm opacity-50">
                      Do komunity
                    </span>
                  )}
                  {shareHint ? <span className="vx-meta">{shareHint}</span> : null}
                </div>
                {!isAuthenticated ? (
                  <p className="mt-2 vx-meta">Zapojte se do diskuse. Přihlášení je zdarma.</p>
                ) : null}

                {wallOpen ? (
                  <div
                    className="mt-4 rounded-[14px] border border-verox-line bg-[#FBF8F2] p-4"
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    <h3 className="vx-kicker text-verox-orangeDeep">Komentáře komunity</h3>
                    <div className="mt-3 max-h-52 space-y-2 overflow-y-auto pr-1">
                      {commentsLoading ? <p className="text-sm text-verox-charcoal">Načítám komentáře…</p> : null}
                      {!commentsLoading && wallComments.length === 0 ? (
                        <p className="text-sm text-verox-charcoal">Zatím bez komentářů. Napište první.</p>
                      ) : (
                        wallComments.map((comment) => (
                          <article key={comment.id} className="rounded-[10px] border border-verox-line bg-white px-3 py-2 shadow-[0_4px_10px_rgba(17,17,17,0.06)]">
                            <div className="flex items-center justify-between gap-2">
                              <span className="vx-kicker text-verox-orangeDeep">{comment.authorName}</span>
                              <span className="vx-meta">{formatWallCommentAt(comment.createdAt)}</span>
                            </div>
                            <p className="mt-1 text-sm text-verox-ink">{comment.body}</p>
                          </article>
                        ))
                      )}
                    </div>
                    {wallError ? <p className="mt-2 vx-meta">{wallError}</p> : null}

                    <div className="mt-3 flex items-end gap-2">
                      <textarea
                        value={wallDraftByPost[item.id] ?? ""}
                        onChange={(event) => {
                          const nextValue = event.target.value;
                          setWallDraftByPost((prev) => ({ ...prev, [item.id]: nextValue }));
                        }}
                        rows={2}
                        placeholder="Napište komentář..."
                        className="min-h-[56px] flex-1 resize-y rounded-[10px] border border-verox-line bg-white px-3 py-2 text-sm text-verox-ink outline-none placeholder:text-verox-gray focus:border-verox-orange"
                      />
                      <button
                        type="button"
                        disabled={commentsSubmitting}
                        className="vx-btn vx-btn--solid vx-btn--sm"
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
            className="vx-btn"
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

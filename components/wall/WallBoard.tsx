"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { SectionLabel } from "@/components/abj/SectionLabel";
import type { WallPost, WallSort, WallStatus } from "@/lib/wallTypes";

type WallBoardProps = {
  videoId?: string | null;
  videoTitle?: string | null;
  heading?: string;
  intro?: string;
  compact?: boolean;
  showHero?: boolean;
};

type PostListResponse = {
  posts: WallPost[];
  hasMore: boolean;
};

type CreatePostResponse = {
  ok: boolean;
  post: WallPost;
  status: WallStatus;
};

type ReactResponse = {
  ok: boolean;
  duplicate: boolean;
  likesCount: number;
};

type ReportResponse = {
  ok: boolean;
  duplicate: boolean;
  reportsCount: number;
  status: WallStatus;
};

type ReplyTarget = {
  id: string;
  author: string;
};

const EMPTY_STATE_TEXT = "Zatím tu žádné příspěvky nejsou. Buďte první, kdo něco přidá do Komunity.";
const INTRO_DEFAULT = "Diskuze diváků, reakce a doporučení.";
const RULES_TEXT = "Kritika je vítaná. Výhrůžky, vulgarity, osobní údaje a spam mažeme.";

const CARD_CLASS =
  "rounded-[14px] border border-verox-line bg-white shadow-[0_8px_18px_rgba(17,17,17,0.10)]";
const INPUT_CLASS =
  "w-full rounded-[10px] border border-verox-line bg-white px-3 py-2 text-base text-verox-ink outline-none transition-colors focus:border-verox-orange";

function formatPostTime(value: string): string {
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

function groupReplies(posts: WallPost[]): {
  roots: WallPost[];
  repliesByParent: Map<string, WallPost[]>;
} {
  const roots: WallPost[] = [];
  const repliesByParent = new Map<string, WallPost[]>();

  for (const post of posts) {
    if (!post.parent_id) {
      roots.push(post);
      continue;
    }
    if (!repliesByParent.has(post.parent_id)) {
      repliesByParent.set(post.parent_id, []);
    }
    repliesByParent.get(post.parent_id)?.push(post);
  }

  roots.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  for (const [key, replies] of repliesByParent.entries()) {
    repliesByParent.set(
      key,
      replies.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    );
  }

  return { roots, repliesByParent };
}

function mergePostList(current: WallPost[], incoming: WallPost[]): WallPost[] {
  const byId = new Map<string, WallPost>();
  for (const post of current) byId.set(post.id, post);
  for (const post of incoming) {
    byId.set(post.id, post);
  }
  return [...byId.values()].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function WallBoard({
  videoId = null,
  videoTitle = null,
  heading = "Komunita",
  intro = INTRO_DEFAULT,
  compact = false,
  showHero = true,
}: WallBoardProps) {
  const { isAuthenticated, requestAuth } = useAuth();
  const [posts, setPosts] = useState<WallPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<WallSort>("newest");
  const [authorName, setAuthorName] = useState("");
  const [authorEmail, setAuthorEmail] = useState("");
  const [body, setBody] = useState("");
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitInfo, setSubmitInfo] = useState<string | null>(null);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("limit", compact ? "30" : "60");
      params.set("offset", "0");
      params.set("sort", sort);
      if (videoId) params.set("video_id", videoId);
      const response = await fetch(`/api/wall/posts?${params.toString()}`, { cache: "no-store" });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Načtení příspěvků selhalo.");
      }
      const payload = (await response.json()) as PostListResponse;
      setPosts(payload.posts ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Načtení příspěvků selhalo.");
    } finally {
      setLoading(false);
    }
  }, [compact, sort, videoId]);

  useEffect(() => {
    void loadPosts();
  }, [loadPosts]);

  const { roots, repliesByParent } = useMemo(() => groupReplies(posts), [posts]);

  const handleCreatePost = async () => {
    if (!isAuthenticated) {
      requestAuth(
        () => {
          // Po přihlášení uživatel znovu odešle vzkaz.
        },
        { reason: "Přihlaste se zdarma a přidejte příspěvek do Komunity." }
      );
      return;
    }
    setSubmitting(true);
    setSubmitInfo(null);
    setError(null);
    try {
      const response = await fetch("/api/wall/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          author_name: authorName,
          author_email: authorEmail || null,
          body,
          video_id: videoId,
          parent_id: replyTarget?.id ?? null,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as CreatePostResponse & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Vzkaz se nepodařilo odeslat.");
      }

      if (payload.status === "approved") {
        setSubmitInfo("Děkujeme. Váš příspěvek je v Komunitě.");
        setPosts((prev) => mergePostList(prev, [payload.post]));
      } else {
        setSubmitInfo("Děkujeme. Váš vzkaz čeká na schválení.");
      }
      setBody("");
      setReplyTarget(null);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Vzkaz se nepodařilo odeslat.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReact = async (postId: string) => {
    if (!isAuthenticated) {
      requestAuth(
        () => {
          // Po přihlášení uživatel může reagovat.
        },
        { reason: "Přihlaste se zdarma a reagujte na příspěvky v Komunitě." }
      );
      return;
    }
    try {
      const response = await fetch(`/api/wall/posts/${encodeURIComponent(postId)}/react`, {
        method: "POST",
      });
      const payload = (await response.json().catch(() => ({}))) as ReactResponse & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Reakci se nepodařilo uložit.");
      }
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? {
                ...post,
                likes_count: payload.likesCount,
              }
            : post
        )
      );
      if (payload.duplicate) {
        setSubmitInfo("Reakce Souhlasím už byla z této relace přidána.");
      }
    } catch (reactError) {
      setError(reactError instanceof Error ? reactError.message : "Reakce se nepodařila.");
    }
  };

  const handleReport = async (postId: string) => {
    if (!isAuthenticated) {
      requestAuth(
        () => {
          // Po přihlášení uživatel může nahlásit příspěvek.
        },
        { reason: "Přihlaste se zdarma pro nahlášení příspěvků." }
      );
      return;
    }
    try {
      const reason = window.prompt("Volitelně napište důvod nahlášení:", "");
      const response = await fetch(`/api/wall/posts/${encodeURIComponent(postId)}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason ?? null }),
      });
      const payload = (await response.json().catch(() => ({}))) as ReportResponse & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Nahlášení se nepodařilo uložit.");
      }
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? {
                ...post,
                reports_count: payload.reportsCount,
                status: payload.status,
              }
            : post
        )
      );
      setSubmitInfo(payload.duplicate ? "Příspěvek už byl z této relace nahlášen." : "Příspěvek byl nahlášen.");
    } catch (reportError) {
      setError(reportError instanceof Error ? reportError.message : "Nahlášení se nepodařilo.");
    }
  };

  return (
    <section className={compact ? "space-y-8" : "mx-auto w-full max-w-6xl space-y-10 px-4 py-8 sm:px-6"}>
      {showHero ? (
        <header className="overflow-hidden bg-verox-orange text-white">
          <div className="flex items-center justify-between gap-3 px-6 pt-5">
            <span className="vx-display text-[1.5rem] leading-none">{heading}</span>
            <span className="text-[0.62rem] uppercase tracking-[0.18em]" style={{ fontFamily: "var(--vx-mono)" }}>
              Komunitní nástěnka
            </span>
          </div>
          <p className="max-w-[52ch] px-6 pt-3 text-[1.02rem] leading-relaxed text-white/95">{intro}</p>
          <p className="mx-6 mb-6 mt-4 border-l-2 border-white/60 bg-black/15 px-3 py-2 text-sm leading-relaxed text-white/90">
            {RULES_TEXT}
          </p>
        </header>
      ) : null}

      <section className={`${CARD_CLASS} p-5 sm:p-6`}>
        {!showHero ? (
          <header className="mb-4">
            <h2 className="vx-display text-[1.6rem] leading-none text-verox-ink">{heading}</h2>
            {videoTitle ? (
              <p className="vx-meta mt-2">Reagujete na video: {videoTitle}</p>
            ) : null}
            <hr className="vx-rule mt-3 h-[2px]" />
          </header>
        ) : null}

        {!isAuthenticated ? (
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-[10px] border border-verox-orange/35 bg-verox-orangeSoft px-4 py-3 text-sm text-verox-ink">
            <span className="flex-1">
              Interakce v Komunitě (přidání, reakce, nahlášení) jsou dostupné pouze po přihlášení.
            </span>
            <button
              type="button"
              className="vx-btn vx-btn--solid vx-btn--sm"
              onClick={() =>
                requestAuth(
                  () => {
                    // Po přihlášení může uživatel pokračovat.
                  },
                  { reason: "Přihlaste se zdarma a zapojte se do diskuse v Komunitě." }
                )
              }
            >
              Přihlásit zdarma
            </button>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="space-y-1.5">
            <span className="vx-kicker text-verox-ink">Přezdívka</span>
            <input
              value={authorName}
              onChange={(event) => setAuthorName(event.target.value)}
              disabled={!isAuthenticated}
              className={`${INPUT_CLASS} disabled:cursor-not-allowed disabled:opacity-60`}
              maxLength={60}
              placeholder="Vaše přezdívka"
            />
          </label>

          <label className="space-y-1.5">
            <span className="vx-kicker text-verox-ink">E-mail (volitelné, nezveřejňujeme)</span>
            <input
              value={authorEmail}
              onChange={(event) => setAuthorEmail(event.target.value)}
              disabled={!isAuthenticated}
              className={`${INPUT_CLASS} disabled:cursor-not-allowed disabled:opacity-60`}
              maxLength={120}
              placeholder="vas@email.cz"
            />
          </label>
        </div>

        {replyTarget ? (
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-[10px] border border-verox-orange/35 bg-verox-orangeSoft px-4 py-2.5 text-sm text-verox-ink">
            <span>Odpovídáte na příspěvek autora {replyTarget.author}.</span>
            <button
              type="button"
              className="vx-action"
              onClick={() => setReplyTarget(null)}
            >
              Zrušit odpověď
            </button>
          </div>
        ) : null}

        <label className="mt-4 block space-y-1.5">
          <span className="vx-kicker text-verox-ink">Vzkaz</span>
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            disabled={!isAuthenticated}
            className={`${INPUT_CLASS} min-h-[120px] leading-relaxed disabled:cursor-not-allowed disabled:opacity-60`}
            maxLength={1500}
            placeholder="Co chcete vzkázat redakci nebo ostatním divákům?"
          />
        </label>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              void handleCreatePost();
            }}
            disabled={submitting}
            aria-disabled={!isAuthenticated}
            className="vx-btn vx-btn--solid disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? "Odesílám..." : !isAuthenticated ? "Přihlásit pro přidání" : "Přidat do Komunity"}
          </button>
          <span className="vx-meta">{body.trim().length}/1500</span>
        </div>

        {submitInfo ? <p className="mt-4 text-sm text-verox-ink">{submitInfo}</p> : null}
        {error ? <p className="mt-2 text-sm text-verox-orangeText">{error}</p> : null}
      </section>

      <section className="space-y-4">
        <SectionLabel
          index="(01)"
          title="Připnuté vzkazy"
          right={
            <div className="inline-flex rounded-[10px] border border-verox-line bg-white p-1">
              <button
                type="button"
                onClick={() => setSort("newest")}
                className={`rounded-[7px] px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.1em] transition-colors ${
                  sort === "newest" ? "bg-verox-orange text-white" : "text-verox-gray hover:text-verox-ink"
                }`}
              >
                Nejnovější
              </button>
              <button
                type="button"
                onClick={() => setSort("popular")}
                className={`rounded-[7px] px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.1em] transition-colors ${
                  sort === "popular" ? "bg-verox-orange text-white" : "text-verox-gray hover:text-verox-ink"
                }`}
              >
                Populární
              </button>
            </div>
          }
        />

        {loading ? (
          <p className={`${CARD_CLASS} px-4 py-4 text-sm text-verox-gray`}>
            Načítám vzkazy...
          </p>
        ) : roots.length === 0 ? (
          <p className={`${CARD_CLASS} px-4 py-4 text-sm text-verox-gray`}>
            {EMPTY_STATE_TEXT}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
            {roots.map((post) => (
              <article
                key={post.id}
                className={`${CARD_CLASS} p-5`}
              >
                <header className="space-y-1">
                  <p className="vx-kicker text-verox-ink">{post.author_name}</p>
                  <p className="vx-meta">{formatPostTime(post.created_at)}</p>
                </header>

                {post.video_id ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="vx-badge">
                      Reakce na video: {post.video_title ?? "Video bez názvu"}
                    </span>
                    <Link
                      href={`/live?videoId=${encodeURIComponent(post.video_id)}`}
                      className="vx-action"
                    >
                      Otevřít video
                    </Link>
                  </div>
                ) : null}

                <p className="mt-4 whitespace-pre-wrap text-base leading-relaxed text-verox-ink">{post.body}</p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="vx-btn vx-btn--ghost-ink vx-btn--sm"
                    onClick={() => {
                      if (!isAuthenticated) {
                        requestAuth(
                          () => {
                            // Po přihlášení může uživatel odpovědět.
                          },
                          { reason: "Přihlaste se zdarma a odpovězte na příspěvek." }
                        );
                        return;
                      }
                      setReplyTarget({ id: post.id, author: post.author_name });
                    }}
                  >
                    Odpovědět
                  </button>
                  <button
                    type="button"
                    className="vx-btn vx-btn--sm"
                    onClick={() => {
                      void handleReact(post.id);
                    }}
                  >
                    Souhlasím ({post.likes_count})
                  </button>
                  <button
                    type="button"
                    className="vx-btn vx-btn--ghost-ink vx-btn--sm"
                    onClick={() => {
                      void handleReport(post.id);
                    }}
                  >
                    Nahlásit
                  </button>
                </div>

                {(repliesByParent.get(post.id) ?? []).length > 0 ? (
                  <div className="mt-5 space-y-3 border-t border-verox-line pt-4">
                    {(repliesByParent.get(post.id) ?? []).map((reply) => (
                      <div key={reply.id} className="rounded-[10px] border border-verox-line bg-verox-paper p-3">
                        <p className="vx-kicker text-verox-ink">
                          {reply.author_name} · {formatPostTime(reply.created_at)}
                        </p>
                        <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-verox-ink">{reply.body}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="vx-btn vx-btn--sm"
                            onClick={() => {
                              void handleReact(reply.id);
                            }}
                          >
                            Souhlasím ({reply.likes_count})
                          </button>
                          <button
                            type="button"
                            className="vx-btn vx-btn--ghost-ink vx-btn--sm"
                            onClick={() => {
                              void handleReport(reply.id);
                            }}
                          >
                            Nahlásit
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}

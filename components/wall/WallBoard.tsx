"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

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

const EMPTY_STATE_TEXT = "Zatím tu žádné vzkazy nejsou. Buďte první, kdo něco připne na Zeď.";
const INTRO_DEFAULT =
  "Tohle je místo pro vaše vzkazy, postřehy a reakce na pořady ABJ. Pište slušně, věcně a pod svou přezdívkou.";
const RULES_TEXT = "Kritika je vítaná. Výhrůžky, vulgarity, osobní údaje a spam mažeme.";

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
  heading = "Zeď diváků",
  intro = INTRO_DEFAULT,
  compact = false,
  showHero = true,
}: WallBoardProps) {
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
        setSubmitInfo("Děkujeme. Váš vzkaz je na Zdi.");
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
    <section className={compact ? "space-y-6" : "mx-auto w-full max-w-6xl space-y-8 px-4 py-6 sm:px-6"}>
      {showHero ? (
        <header className="rounded-2xl border border-[var(--abj-gold-dim)] bg-abj-panel p-5 shadow-[0_8px_24px_rgba(17,17,17,0.08)]">
          <p className="text-[11px] uppercase tracking-[0.14em] text-abj-text2">Komunitní nástěnka</p>
          <h1 className="mt-2 font-[var(--font-serif)] text-3xl font-semibold text-abj-text1">{heading}</h1>
          <p className="mt-2 text-base leading-relaxed text-abj-text2">{intro}</p>
          <p className="mt-3 rounded-lg border border-[rgba(255,106,0,0.25)] bg-[rgba(255,106,0,0.08)] px-3 py-2 text-sm text-abj-text1">
            {RULES_TEXT}
          </p>
        </header>
      ) : null}

      <section className="rounded-2xl border border-[var(--abj-gold-dim)] bg-white p-4 shadow-[0_8px_24px_rgba(17,17,17,0.08)] sm:p-5">
        {!showHero ? (
          <header className="mb-3">
            <h2 className="font-[var(--font-serif)] text-2xl font-semibold text-abj-text1">{heading}</h2>
            {videoTitle ? (
              <p className="mt-1 text-sm text-abj-text2">Reagujete na video: {videoTitle}</p>
            ) : null}
          </header>
        ) : null}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-sm font-medium text-abj-text1">Přezdívka</span>
            <input
              value={authorName}
              onChange={(event) => setAuthorName(event.target.value)}
              className="w-full rounded-lg border border-[var(--abj-gold-dim)] px-3 py-2 text-base text-abj-text1 outline-none focus:border-[#FF6A00]"
              maxLength={60}
              placeholder="Vaše přezdívka"
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-abj-text1">E-mail (volitelné, nezveřejňujeme)</span>
            <input
              value={authorEmail}
              onChange={(event) => setAuthorEmail(event.target.value)}
              className="w-full rounded-lg border border-[var(--abj-gold-dim)] px-3 py-2 text-base text-abj-text1 outline-none focus:border-[#FF6A00]"
              maxLength={120}
              placeholder="vas@email.cz"
            />
          </label>
        </div>

        {replyTarget ? (
          <div className="mt-3 rounded-lg border border-[rgba(255,106,0,0.3)] bg-[rgba(255,106,0,0.08)] px-3 py-2 text-sm text-abj-text1">
            Odpovídáte na příspěvek autora {replyTarget.author}.
            <button
              type="button"
              className="ml-3 underline decoration-[rgba(255,106,0,0.7)] underline-offset-2"
              onClick={() => setReplyTarget(null)}
            >
              Zrušit odpověď
            </button>
          </div>
        ) : null}

        <label className="mt-3 block space-y-1">
          <span className="text-sm font-medium text-abj-text1">Vzkaz</span>
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            className="min-h-[120px] w-full rounded-lg border border-[var(--abj-gold-dim)] px-3 py-2 text-base leading-relaxed text-abj-text1 outline-none focus:border-[#FF6A00]"
            maxLength={1500}
            placeholder="Co chcete vzkázat redakci nebo ostatním divákům?"
          />
        </label>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              void handleCreatePost();
            }}
            disabled={submitting}
            className="rounded-lg border border-[#FF6A00] bg-[#FF6A00] px-4 py-2 text-sm font-semibold uppercase tracking-[0.08em] text-white disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? "Odesílám..." : "Připnout na Zeď"}
          </button>
          <span className="text-xs text-abj-text2">{body.trim().length}/1500</span>
        </div>

        {submitInfo ? <p className="mt-3 text-sm text-abj-text1">{submitInfo}</p> : null}
        {error ? <p className="mt-2 text-sm text-[#D14A2A]">{error}</p> : null}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-[var(--font-serif)] text-2xl font-semibold text-abj-text1">Připnuté vzkazy</h2>
          <div className="inline-flex rounded-lg border border-[var(--abj-gold-dim)] bg-white p-1">
            <button
              type="button"
              onClick={() => setSort("newest")}
              className={`rounded-md px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] ${
                sort === "newest" ? "bg-[rgba(255,106,0,0.12)] text-[#FF6A00]" : "text-abj-text2"
              }`}
            >
              Nejnovější
            </button>
            <button
              type="button"
              onClick={() => setSort("popular")}
              className={`rounded-md px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] ${
                sort === "popular" ? "bg-[rgba(255,106,0,0.12)] text-[#FF6A00]" : "text-abj-text2"
              }`}
            >
              Populární
            </button>
          </div>
        </div>

        {loading ? (
          <p className="rounded-xl border border-[var(--abj-gold-dim)] bg-abj-panel px-4 py-4 text-sm text-abj-text2">
            Načítám vzkazy...
          </p>
        ) : roots.length === 0 ? (
          <p className="rounded-xl border border-[var(--abj-gold-dim)] bg-abj-panel px-4 py-4 text-sm text-abj-text2">
            {EMPTY_STATE_TEXT}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {roots.map((post) => (
              <article
                key={post.id}
                className="rounded-2xl border border-[var(--abj-gold-dim)] bg-white p-4 shadow-[0_8px_20px_rgba(17,17,17,0.08)]"
              >
                <header className="space-y-1">
                  <p className="text-sm font-semibold text-abj-text1">{post.author_name}</p>
                  <p className="text-xs text-abj-text2">{formatPostTime(post.created_at)}</p>
                </header>

                {post.video_id ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="inline-flex rounded-full border border-[rgba(255,106,0,0.3)] bg-[rgba(255,106,0,0.08)] px-2 py-0.5 text-[11px] font-medium text-[#FF6A00]">
                      Reakce na video: {post.video_title ?? post.video_id}
                    </span>
                    <Link
                      href={`/live?videoId=${encodeURIComponent(post.video_id)}`}
                      className="text-[11px] font-medium text-abj-text2 underline decoration-[rgba(255,106,0,0.5)] underline-offset-2 hover:text-abj-text1"
                    >
                      Otevřít video
                    </Link>
                  </div>
                ) : null}

                <p className="mt-3 whitespace-pre-wrap text-base leading-relaxed text-abj-text1">{post.body}</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-lg border border-[var(--abj-gold-dim)] px-3 py-1.5 text-xs font-medium uppercase tracking-[0.08em] text-abj-text2 hover:text-abj-text1"
                    onClick={() => setReplyTarget({ id: post.id, author: post.author_name })}
                  >
                    Odpovědět
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-[rgba(255,106,0,0.35)] bg-[rgba(255,106,0,0.08)] px-3 py-1.5 text-xs font-medium uppercase tracking-[0.08em] text-[#FF6A00]"
                    onClick={() => {
                      void handleReact(post.id);
                    }}
                  >
                    Souhlasím ({post.likes_count})
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-[var(--abj-gold-dim)] px-3 py-1.5 text-xs font-medium uppercase tracking-[0.08em] text-abj-text2 hover:text-abj-text1"
                    onClick={() => {
                      void handleReport(post.id);
                    }}
                  >
                    Nahlásit
                  </button>
                </div>

                {(repliesByParent.get(post.id) ?? []).length > 0 ? (
                  <div className="mt-4 space-y-2 border-t border-[var(--abj-gold-dim)] pt-3">
                    {(repliesByParent.get(post.id) ?? []).map((reply) => (
                      <div key={reply.id} className="rounded-lg border border-[var(--abj-gold-dim)] bg-abj-panel p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-abj-text2">
                          {reply.author_name} · {formatPostTime(reply.created_at)}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-abj-text1">{reply.body}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="rounded-md border border-[rgba(255,106,0,0.35)] bg-[rgba(255,106,0,0.08)] px-2 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-[#FF6A00]"
                            onClick={() => {
                              void handleReact(reply.id);
                            }}
                          >
                            Souhlasím ({reply.likes_count})
                          </button>
                          <button
                            type="button"
                            className="rounded-md border border-[var(--abj-gold-dim)] px-2 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-abj-text2"
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


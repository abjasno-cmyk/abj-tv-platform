"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useFeed } from "@/hooks/useFeed";
import type { FeedPost } from "@/lib/api";

type FeedItem = {
  id: string;
  channel: string;
  headline: string;
  what: string;
  why: string | null;
  impact: string | null;
  freshness: "breaking" | "today" | "week" | "evergreen";
  urgency: 1 | 2 | 3;
  displayAt: string;
  videoId: string;
};

type CreatePostResponse = {
  ok: boolean;
  status: "pending" | "approved" | "rejected" | "hidden" | "flagged";
  error?: string;
};

const WALL_AUTHOR_STORAGE_KEY = "abj.wall.author-name";
const WALL_EMAIL_STORAGE_KEY = "abj.wall.author-email";

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
    displayAt:
      (post as FeedPost & { editorial_at?: string | null }).editorial_at ??
      (post as FeedPost & { updated_at?: string | null }).updated_at ??
      post.created_at,
    videoId: post.video_id,
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

export function AbjXClient() {
  const { posts, loading, hasMore, loadMore } = useFeed();
  const items = useMemo(() => toItems(posts), [posts]);
  const [wallAuthor, setWallAuthor] = useState("");
  const [wallEmail, setWallEmail] = useState("");
  const [composeTargetId, setComposeTargetId] = useState<string | null>(null);
  const [composeText, setComposeText] = useState("");
  const [postingLikeId, setPostingLikeId] = useState<string | null>(null);
  const [postingCommentId, setPostingCommentId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const savedName = window.localStorage.getItem(WALL_AUTHOR_STORAGE_KEY);
      const savedEmail = window.localStorage.getItem(WALL_EMAIL_STORAGE_KEY);
      if (savedName) setWallAuthor(savedName);
      if (savedEmail) setWallEmail(savedEmail);
    } catch {
      // Ignore storage read issues.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(WALL_AUTHOR_STORAGE_KEY, wallAuthor);
      window.localStorage.setItem(WALL_EMAIL_STORAGE_KEY, wallEmail);
    } catch {
      // Ignore storage write issues.
    }
  }, [wallAuthor, wallEmail]);

  const resolveAuthor = (): string | null => {
    const trimmed = wallAuthor.trim();
    if (trimmed.length >= 2) return trimmed;
    setError("Pro propsání na Zeď nejdříve vyplňte přezdívku (min. 2 znaky).");
    return null;
  };

  const postToWall = async (payload: {
    authorName: string;
    authorEmail: string | null;
    body: string;
    videoId: string;
  }): Promise<string> => {
    const response = await fetch("/api/wall/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        author_name: payload.authorName,
        author_email: payload.authorEmail,
        body: payload.body,
        video_id: payload.videoId,
      }),
    });
    const result = (await response.json().catch(() => ({}))) as CreatePostResponse;
    if (!response.ok) {
      throw new Error(result.error ?? "Odeslání na Zeď selhalo.");
    }
    if (result.status === "approved") {
      return "Příspěvek byl přidán na Zeď.";
    }
    return "Příspěvek byl přijat a čeká na schválení.";
  };

  const handleLikeToWall = async (item: FeedItem) => {
    const author = resolveAuthor();
    if (!author) return;
    setPostingLikeId(item.id);
    setError(null);
    setFeedback(null);
    try {
      const info = await postToWall({
        authorName: author,
        authorEmail: wallEmail.trim() || null,
        body: `Souhlasím s ABJ X: ${item.headline}`,
        videoId: item.videoId,
      });
      setFeedback(info);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Odeslání na Zeď selhalo.");
    } finally {
      setPostingLikeId(null);
    }
  };

  const handleCommentToWall = async (item: FeedItem) => {
    const author = resolveAuthor();
    if (!author) return;
    const trimmedText = composeText.trim();
    if (trimmedText.length < 3) {
      setError("Komentář pro Zeď musí mít alespoň 3 znaky.");
      return;
    }

    setPostingCommentId(item.id);
    setError(null);
    setFeedback(null);
    try {
      const info = await postToWall({
        authorName: author,
        authorEmail: wallEmail.trim() || null,
        body: trimmedText,
        videoId: item.videoId,
      });
      setFeedback(info);
      setComposeText("");
      setComposeTargetId(null);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Odeslání komentáře na Zeď selhalo.");
    } finally {
      setPostingCommentId(null);
    }
  };

  return (
    <section className="mx-auto w-full max-w-4xl space-y-6 px-3 py-6 sm:px-5">
      <header className="space-y-2">
        <p className="text-[11px] uppercase tracking-[0.14em] text-abj-text2">ABJ X</p>
        <h1 className="font-[var(--font-serif)] text-3xl font-semibold text-abj-text1">Textové zprávy</h1>
        <p className="text-sm text-abj-text2">Krátké zprávy a souvislosti napříč ABJ sítí</p>
      </header>

      <section className="rounded-xl border border-[var(--abj-gold-dim)] bg-abj-panel p-3 sm:p-4">
        <p className="text-xs uppercase tracking-[0.08em] text-abj-text2">Rychlé propsání na Zeď</p>
        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-xs text-abj-text2">Přezdívka pro Zeď</span>
            <input
              value={wallAuthor}
              onChange={(event) => setWallAuthor(event.target.value)}
              className="w-full rounded-lg border border-[var(--abj-gold-dim)] bg-white px-3 py-2 text-sm text-abj-text1 outline-none focus:border-[#FF6A00]"
              placeholder="Např. Hana"
              maxLength={60}
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-abj-text2">E-mail (volitelně, nezveřejní se)</span>
            <input
              value={wallEmail}
              onChange={(event) => setWallEmail(event.target.value)}
              className="w-full rounded-lg border border-[var(--abj-gold-dim)] bg-white px-3 py-2 text-sm text-abj-text1 outline-none focus:border-[#FF6A00]"
              placeholder="vas@email.cz"
              maxLength={120}
            />
          </label>
        </div>
        {feedback ? <p className="mt-2 text-sm text-abj-text1">{feedback}</p> : null}
        {error ? <p className="mt-1 text-sm text-[#D14A2A]">{error}</p> : null}
      </section>

      {items.length === 0 && !loading ? (
        <div className="rounded-xl border border-[var(--abj-gold-dim)] bg-abj-panel p-6 text-sm text-abj-text2">
          Zatím žádné textové zprávy.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <article key={item.id} className="rounded-xl border border-[var(--abj-gold-dim)] bg-abj-panel p-3 sm:p-4">
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
              </div>

              <h2 className="text-base font-semibold text-abj-text1 sm:text-lg">{item.headline}</h2>
              <p className="mt-1 text-sm text-abj-text1">{item.what}</p>
              {item.why ? <p className="mt-1 text-sm text-abj-text2">{item.why}</p> : null}
              {item.impact ? <p className="mt-1 text-sm font-medium text-abj-gold">{item.impact}</p> : null}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-[rgba(255,106,0,0.35)] bg-[rgba(255,106,0,0.08)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#FF6A00]"
                  onClick={() => {
                    void handleLikeToWall(item);
                  }}
                  disabled={postingLikeId === item.id}
                >
                  {postingLikeId === item.id ? "Ukládám..." : "Souhlasím na Zdi"}
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-[var(--abj-gold-dim)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-abj-text2 hover:text-abj-text1"
                  onClick={() => {
                    setComposeTargetId((prev) => (prev === item.id ? null : item.id));
                    setComposeText("");
                    setFeedback(null);
                    setError(null);
                  }}
                >
                  Komentovat na Zdi
                </button>
                <Link
                  href={`/zed?video_id=${encodeURIComponent(item.videoId)}&video_title=${encodeURIComponent(item.headline)}`}
                  className="text-[11px] font-medium text-abj-text2 underline decoration-[rgba(255,106,0,0.5)] underline-offset-2 hover:text-abj-text1"
                >
                  Otevřít vlákno
                </Link>
              </div>

              {composeTargetId === item.id ? (
                <div className="mt-3 space-y-2 rounded-lg border border-[var(--abj-gold-dim)] bg-white p-3">
                  <textarea
                    value={composeText}
                    onChange={(event) => setComposeText(event.target.value)}
                    className="min-h-[90px] w-full rounded-md border border-[var(--abj-gold-dim)] px-3 py-2 text-sm text-abj-text1 outline-none focus:border-[#FF6A00]"
                    placeholder="Napište komentář k této zprávě ABJ X, který se propíše na Zeď..."
                    maxLength={1500}
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className="rounded-lg border border-[#FF6A00] bg-[#FF6A00] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-white"
                      onClick={() => {
                        void handleCommentToWall(item);
                      }}
                      disabled={postingCommentId === item.id}
                    >
                      {postingCommentId === item.id ? "Odesílám..." : "Odeslat na Zeď"}
                    </button>
                    <span className="text-[11px] text-abj-text2">{composeText.trim().length}/1500</span>
                  </div>
                </div>
              ) : null}
            </article>
          ))}
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

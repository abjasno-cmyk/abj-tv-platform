"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { DeleteAccountPanel } from "@/components/auth/DeleteAccountPanel";
import { MujVeroxAuthorStudio } from "@/components/nazory/MujVeroxAuthorStudio";
import { MyVeroxEngagement } from "@/components/viewer/MyVeroxEngagement";
import { MyVeroxLibrary } from "@/components/viewer/MyVeroxLibrary";
import { buildWallTree, formatWallPostTime, type WallTreeNode } from "@/lib/wallThread";
import type { WallPost } from "@/lib/wallTypes";

const MAX_LEN = 1500;
const REPLIES_PREVIEW = 2;

type WallThreadCardProps = {
  node: WallTreeNode;
  isReply?: boolean;
  replyToName?: string | null;
  replyParentId: string | null;
  likesById: Record<string, number>;
  reactedIds: Record<string, boolean>;
  reactingId: string | null;
  isAuthenticated: boolean;
  onReply: (postId: string, authorName: string) => void;
  onLike: (postId: string) => void;
  onRequireAuth: (reason: string, after?: () => void) => void;
};

function WallThreadCard({
  node,
  isReply = false,
  replyToName = null,
  replyParentId,
  likesById,
  reactedIds,
  reactingId,
  isAuthenticated,
  onReply,
  onLike,
  onRequireAuth,
}: WallThreadCardProps) {
  const likes = likesById[node.id] ?? node.likes_count;
  const hasReacted = Boolean(reactedIds[node.id]);
  const isReacting = reactingId === node.id;
  return (
    <article className={`mv-post${isReply ? " mv-post--reply" : ""}`}>
      <div className="mv-post-head">
        <p className="mv-post-author">{node.author_name}</p>
        <time className="mv-post-time" dateTime={node.created_at}>
          {formatWallPostTime(node.created_at)}
        </time>
      </div>
      {isReply && replyToName ? (
        <p className="mv-post-reply-to">
          <span aria-hidden="true">↳</span> {replyToName}
        </p>
      ) : null}
      <p className="mv-post-body">{node.body}</p>
      <div className="mv-post-footer">
        <button
          type="button"
          className={`mv-post-like${hasReacted ? " is-liked" : ""}`}
          disabled={hasReacted || isReacting}
          aria-pressed={hasReacted}
          onClick={() => {
            if (!isAuthenticated) {
              onRequireAuth("Pro reakci srdcem se přihlaste zdarma.", () => onLike(node.id));
              return;
            }
            onLike(node.id);
          }}
        >
          <span aria-hidden="true">{hasReacted ? "♥" : "♡"}</span>
          {likes > 0 ? <span>{likes}</span> : null}
          <span>{hasReacted ? "Líbí se" : "Líbí se mi"}</span>
        </button>
        <button
          type="button"
          className="mv-post-reply-btn"
          onClick={() => {
            if (!isAuthenticated) {
              onRequireAuth("Pro odpověď ve diskusi se přihlaste zdarma.", () =>
                onReply(node.id, node.author_name),
              );
              return;
            }
            onReply(node.id, node.author_name);
          }}
        >
          Odpovědět
        </button>
      </div>
      {replyParentId === node.id ? (
        <p className="mv-post-replying">Odpověď napíšete do formuláře výše.</p>
      ) : null}
    </article>
  );
}

type WallThreadProps = Omit<WallThreadCardProps, "node" | "isReply"> & { node: WallTreeNode };

function WallThread(props: WallThreadProps) {
  const { node, ...rest } = props;
  const [expanded, setExpanded] = useState(false);
  const hiddenCount = Math.max(0, node.replies.length - REPLIES_PREVIEW);
  const visibleReplies = expanded ? node.replies : node.replies.slice(0, REPLIES_PREVIEW);

  return (
    <div className="mv-thread">
      <WallThreadCard node={node} {...rest} />
      {node.replies.length > 0 ? (
        <div className="mv-thread-replies">
          <div className="mv-thread-line" aria-hidden="true" />
          <div className="mv-thread-reply-list">
            {visibleReplies.map((reply) => (
              <WallThreadCard
                key={reply.id}
                node={reply}
                isReply
                replyToName={node.author_name}
                {...rest}
              />
            ))}
            {hiddenCount > 0 && !expanded ? (
              <button type="button" className="mv-thread-more" onClick={() => setExpanded(true)}>
                Zobrazit další odpovědi ({hiddenCount}) ▾
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

// MŮJ VEROX: komunitní diskuze s odpověďmi ve stylu Seznam.cz (vlákna + srdíčko).
export function MujVeroxTemplate() {
  const { isAuthenticated, profile, openLoginModal, requestAuth } = useAuth();
  const [sort, setSort] = useState<"newest" | "popular">("popular");
  const [posts, setPosts] = useState<WallPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [nick, setNick] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [likesById, setLikesById] = useState<Record<string, number>>({});
  const [reactedIds, setReactedIds] = useState<Record<string, boolean>>({});
  const [reactingId, setReactingId] = useState<string | null>(null);
  const [replyParentId, setReplyParentId] = useState<string | null>(null);
  const [replyParentName, setReplyParentName] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.display_name && !nick) setNick(profile.display_name);
  }, [profile?.display_name, nick]);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/wall/posts?sort=${sort}&limit=50`, { cache: "no-store" });
      const data = (await res.json().catch(() => ({}))) as { posts?: WallPost[] };
      setPosts(Array.isArray(data.posts) ? data.posts : []);
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [sort]);

  useEffect(() => {
    void loadPosts();
  }, [loadPosts]);

  const tree = useMemo(() => buildWallTree(posts, sort), [posts, sort]);

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const body = message.trim();
      const author = nick.trim();
      if (!author || !body) {
        setNotice("Vyplňte přezdívku i vzkaz.");
        return;
      }
      setSubmitting(true);
      setNotice(null);
      try {
        const res = await fetch("/api/wall/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            author_name: author,
            author_email: email.trim() || null,
            body,
            parent_id: replyParentId,
          }),
        });
        const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
        if (!res.ok || !data.ok) {
          setNotice(data.error ?? "Odeslání se nezdařilo.");
          return;
        }
        setMessage("");
        setReplyParentId(null);
        setReplyParentName(null);
        setNotice(replyParentId ? "Odpověď byla odeslána a čeká na schválení." : "Vzkaz byl odeslán a čeká na schválení.");
        void loadPosts();
      } catch {
        setNotice("Odeslání se nezdařilo.");
      } finally {
        setSubmitting(false);
      }
    },
    [message, nick, email, loadPosts, replyParentId],
  );

  const react = useCallback(
    async (postId: string) => {
      if (reactingId || reactedIds[postId]) return;
      setReactingId(postId);
      try {
        const res = await fetch(`/api/wall/posts/${encodeURIComponent(postId)}/react`, {
          method: "POST",
        });
        const data = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          likesCount?: number;
          error?: string;
        };
        if (!res.ok || !data.ok) {
          setNotice(data.error ?? "Reakci se nepodařilo uložit.");
          return;
        }
        if (typeof data.likesCount === "number") {
          setLikesById((prev) => ({ ...prev, [postId]: data.likesCount! }));
        }
        setReactedIds((prev) => ({ ...prev, [postId]: true }));
      } catch {
        setNotice("Reakci se nepodařilo uložit.");
      } finally {
        setReactingId(null);
      }
    },
    [reactingId, reactedIds],
  );

  const handleReply = useCallback((postId: string, authorName: string) => {
    setReplyParentId(postId);
    setReplyParentName(authorName);
    setNotice(null);
    document.getElementById("mv-msg")?.focus();
  }, []);

  const requireAuth = useCallback(
    (reason: string, after?: () => void) => {
      requestAuth(() => after?.(), { reason });
    },
    [requestAuth],
  );

  const counter = useMemo(() => `${message.length}/${MAX_LEN}`, [message.length]);

  return (
    <div className="vx-live vx-sub muj-verox-page">
      <div className="mv">
        <h1>MŮJ VEROX</h1>
      </div>

      <MujVeroxAuthorStudio />

      <div className="vx-strip w75">
        <span />
        <span />
      </div>

      <div className="mv">
        <h2>VAŠE VIDEA, KANÁLY A DISKUZE</h2>
        <div className="sub">Uložená videa, sledování a oblíbené kanály — plus komunitní diskuze níže.</div>
        {!isAuthenticated ? (
          <>
            <div className="info">
              INTERAKCE V KOMUNITĚ (PŘIDÁNÍ, ODPOVĚDI, REAKCE) JSOU DOSTUPNÉ POUZE PO PŘIHLÁŠENÍ.
            </div>
            <button
              type="button"
              className="cta"
              onClick={() => openLoginModal({ reason: "Přihlaste se zdarma a zapojte se do diskuze." })}
            >
              PŘIHLÁSIT ZDARMA
            </button>
          </>
        ) : (
          <p className="sub" style={{ marginTop: "1rem" }}>
            Komentáře přímo k videím najdete na{" "}
            <Link href="/live" style={{ color: "var(--vx-orange)", fontWeight: 700 }}>
              ŽIVĚ
            </Link>{" "}
            (ikona komentářů u přehrávače).
          </p>
        )}
      </div>

      <div className="vx-strip w75">
        <span />
        <span />
      </div>

      <MyVeroxEngagement />

      <div className="vx-strip w75">
        <span />
        <span />
      </div>

      <MyVeroxLibrary />

      <div className="vx-strip w75">
        <span />
        <span />
      </div>

      <DeleteAccountPanel />

      <div className="vx-strip w75">
        <span />
        <span />
      </div>

      <div className="mv-discussion-block">
        <div className="pinned">
          <div className="filters">
            <button
              type="button"
              className={sort === "newest" ? "active" : "inactive"}
              onClick={() => setSort("newest")}
            >
              NEJNOVĚJŠÍ
            </button>
            <button
              type="button"
              className={sort === "popular" ? "active" : "inactive"}
              onClick={() => setSort("popular")}
            >
              POPULÁRNÍ
            </button>
          </div>
          <div className="col">
            <h2>DISKUSE</h2>
            {loading ? (
              <div className="empty">Načítám příspěvky…</div>
            ) : tree.length === 0 ? (
              <div className="empty">Zatím tu žádné příspěvky nejsou. Buďte první.</div>
            ) : (
              <div className="mv-thread-list">
                {tree.map((node) => (
                  <WallThread
                    key={node.id}
                    node={node}
                    replyParentId={replyParentId}
                    likesById={likesById}
                    reactedIds={reactedIds}
                    reactingId={reactingId}
                    isAuthenticated={isAuthenticated}
                    onReply={handleReply}
                    onLike={(id) => {
                      void react(id);
                    }}
                    onRequireAuth={requireAuth}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <aside className="mv-message-panel" aria-label="Přidat vzkaz">
          <form onSubmit={submit}>
            {replyParentId && replyParentName ? (
              <p className="mv-reply-hint">
                Odpovídáte uživateli <strong>{replyParentName}</strong>
                <button
                  type="button"
                  className="mv-reply-cancel"
                  onClick={() => {
                    setReplyParentId(null);
                    setReplyParentName(null);
                  }}
                >
                  Zrušit
                </button>
              </p>
            ) : null}
            <div className="form-row">
              <label htmlFor="mv-nick">PŘEZDÍVKA</label>
              <span />
              <div className="field">
                <input
                  id="mv-nick"
                  value={nick}
                  onChange={(e) => setNick(e.target.value)}
                  placeholder="Vaše přezdívka"
                  maxLength={60}
                  disabled={!isAuthenticated}
                />
              </div>
            </div>
            <div className="form-row">
              <label htmlFor="mv-email">
                E-MAIL
                <small>( volitelné, nezveřejňujeme )</small>
              </label>
              <span />
              <div className="field">
                <input
                  id="mv-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vas@email.cz"
                  disabled={!isAuthenticated}
                />
              </div>
            </div>
            <div className="form-row">
              <label htmlFor="mv-msg">{replyParentId ? "ODPOVĚĎ" : "VZKAZ"}</label>
              <span />
              <div className="field">
                <textarea
                  id="mv-msg"
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, MAX_LEN))}
                  placeholder={
                    replyParentId
                      ? "Napište odpověď..."
                      : "Co chcete vzkázat redakci, nebo ostatním divákům?"
                  }
                  disabled={!isAuthenticated}
                />
              </div>
            </div>
            <div className="submit-row">
              <span />
              <span />
              <div className="submit">
                <button type="submit" disabled={submitting || !isAuthenticated}>
                  {submitting ? "ODESÍLÁM…" : replyParentId ? "ODESLAT ODPOVĚĎ" : "PŘIDAT VZKAZ"}
                </button>
                <span className="count">{counter}</span>
              </div>
            </div>
          </form>
          {notice ? (
            <p className="mv-message-notice">
              <span className="sub">{notice}</span>
            </p>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

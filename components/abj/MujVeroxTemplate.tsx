"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import type { WallPost } from "@/lib/wallTypes";

const MAX_LEN = 1500;

// MŮJ VEROX podle klientské šablony: komunitní diskuze — formulář vzkazu +
// PŘIPNUTÉ VZKAZY, napojené na reálné wall API (/api/wall/posts).
export function MujVeroxTemplate() {
  const { isAuthenticated, profile, openLoginModal } = useAuth();
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

  useEffect(() => {
    if (profile?.display_name && !nick) setNick(profile.display_name);
  }, [profile?.display_name, nick]);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/wall/posts?sort=${sort}&limit=20`, { cache: "no-store" });
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
          }),
        });
        const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
        if (!res.ok || !data.ok) {
          setNotice(data.error ?? "Odeslání se nezdařilo.");
          return;
        }
        setMessage("");
        setNotice("Vzkaz byl odeslán a čeká na schválení.");
        void loadPosts();
      } catch {
        setNotice("Odeslání se nezdařilo.");
      } finally {
        setSubmitting(false);
      }
    },
    [message, nick, email, loadPosts],
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

  const counter = useMemo(() => `${message.length}/${MAX_LEN}`, [message.length]);

  return (
    <div className="vx-live vx-sub">
      <div className="mv">
        <h1>MŮJ VEROX</h1>
        <h2>DISKUZE DIVÁKŮ, REAKCE A DOPORUČENÍ</h2>
        <div className="sub">Kritika je vítaná, výhrůžky, vulgarity, osobní údaje a spam mažeme.</div>
        {!isAuthenticated ? (
          <>
            <div className="info">
              INTERAKCE V KOMUNITĚ ( PŘIDÁNÍ, REAKCE, NAHLÁŠENÍ ) JSOU DOSTUPNÉ POUZE PO PŘIHLÁŠENÍ.
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
            Pro komentáře k videím, ovládací lištu přehrávače a výběr z kanálů přejděte na{" "}
            <Link href="/live" style={{ color: "var(--vx-orange)", fontWeight: 700 }}>
              ŽIVĚ
            </Link>
            .
          </p>
        )}
      </div>

      <div className="vx-strip w75">
        <span />
        <span />
      </div>

      <form onSubmit={submit}>
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
            />
          </div>
        </div>
        <div className="form-row">
          <label htmlFor="mv-msg">VZKAZ</label>
          <span />
          <div className="field">
            <textarea
              id="mv-msg"
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, MAX_LEN))}
              placeholder="Co chcete vzkázat redakci, nebo ostatním divákům ?"
            />
          </div>
        </div>
        <div className="submit-row">
          <span />
          <span />
          <div className="submit">
            <button type="submit" disabled={submitting}>
              {submitting ? "ODESÍLÁM…" : "PŘIDAT VZKAZ"}
            </button>
            <span className="count">{counter}</span>
          </div>
        </div>
      </form>

      {notice ? (
        <p className="mv" style={{ marginTop: "2cqw" }}>
          <span className="sub">{notice}</span>
        </p>
      ) : null}

      <div className="vx-strip w75">
        <span />
        <span />
      </div>

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
          <h2>PŘIPNUTÉ VZKAZY</h2>
          {loading ? (
            <div className="empty">Načítám vzkazy…</div>
          ) : posts.length === 0 ? (
            <div className="empty">Zatím tu žádné příspěvky nejsou. Buďte první, kdo něco přidá do Komunity.</div>
          ) : (
            <ul style={{ listStyle: "none", margin: "2cqw 0 0", padding: 0, display: "grid", gap: "2cqw" }}>
              {posts.map((post) => (
                <li
                  key={post.id}
                  style={{ border: "1px solid #eee", padding: "2.5cqw", background: "#fff" }}
                >
                  <div style={{ fontWeight: 700, color: "var(--vx-gray-dark)", fontSize: "0.95rem" }}>
                    {post.author_name}
                  </div>
                  <p style={{ color: "var(--vx-gray-dark)", margin: "0.4em 0 0", lineHeight: 1.4 }}>{post.body}</p>
                  {(() => {
                    const likes = likesById[post.id] ?? post.likes_count;
                    const hasReacted = Boolean(reactedIds[post.id]);
                    const isReacting = reactingId === post.id;
                    return (
                      <button
                        type="button"
                        onClick={() => void react(post.id)}
                        disabled={hasReacted || isReacting}
                        aria-pressed={hasReacted}
                        aria-label={hasReacted ? "Reakce odeslána" : "Reagovat na vzkaz"}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.35em",
                          marginTop: "0.6em",
                          padding: "0.3em 0.7em",
                          border: "1px solid var(--vx-orange)",
                          background: hasReacted ? "var(--vx-orange)" : "transparent",
                          color: hasReacted ? "#fff" : "var(--vx-orange)",
                          fontSize: "0.85rem",
                          fontWeight: 700,
                          borderRadius: 3,
                          cursor: hasReacted || isReacting ? "default" : "pointer",
                        }}
                      >
                        ♥ {likes > 0 ? likes : ""} {hasReacted ? "Líbí se" : "Reagovat"}
                      </button>
                    );
                  })()}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

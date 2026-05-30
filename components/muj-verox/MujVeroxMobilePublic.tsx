"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { VeroxDoubleDivider } from "@/components/abj/VeroxDoubleDivider";
import { useAuth } from "@/components/auth/AuthProvider";
import type { WallPost, WallSort } from "@/lib/wallTypes";

const EMPTY_STATE_TEXT = "Zatím tu žádné příspěvky nejsou. Buďte první, kdo něco přidá do Komunity.";

type PostListResponse = {
  posts: WallPost[];
  hasMore: boolean;
};

export function MujVeroxMobilePublic() {
  const { openLoginModal, requestAuth, isAuthenticated } = useAuth();
  const [sort, setSort] = useState<WallSort>("popular");
  const [posts, setPosts] = useState<WallPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorName, setAuthorName] = useState("");
  const [authorEmail, setAuthorEmail] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitInfo, setSubmitInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("limit", "40");
      params.set("offset", "0");
      params.set("sort", sort);
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
  }, [sort]);

  useEffect(() => {
    void loadPosts();
  }, [loadPosts]);

  const pinnedRoots = useMemo(
    () => posts.filter((post) => !post.parent_id).slice(0, 8),
    [posts]
  );

  const handleCreatePost = async () => {
    if (!isAuthenticated) {
      requestAuth(() => {}, { reason: "Přihlaste se zdarma a přidejte vzkaz do Komunity." });
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
          video_id: null,
          parent_id: null,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        post?: WallPost;
        status?: string;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Vzkaz se nepodařilo odeslat.");
      }
      setSubmitInfo(payload.status === "approved" ? "Děkujeme. Váš příspěvek je v Komunitě." : "Děkujeme. Váš vzkaz čeká na schválení.");
      if (payload.post) {
        setPosts((prev) => [payload.post!, ...prev]);
      }
      setBody("");
      void loadPosts();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Vzkaz se nepodařilo odeslat.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="verox-muj-verox-mobile-only bg-[#FFFFFF] pb-10 text-[#303030]">
      <section className="px-[3.55%] py-6 text-center">
        <h1 className="verox-muj-verox-intro-title verox-font-myriad-regular uppercase tracking-[0.05em] text-[#F37021]">
          MŮJ VEROX
        </h1>
        <p className="verox-muj-verox-intro-subtitle verox-font-myriad-bold mt-3 uppercase tracking-[0.05em] text-[#303030]">
          DISKUZE DIVÁKŮ, REAKCE A DOPORUČENÍ
        </p>
        <p className="verox-muj-verox-intro-muted verox-font-myriad-regular mt-3 tracking-[0.05em] text-[#717171]">
          Kritika je vítaná, výhrůžky, vulgarity, osobní údaje a spam mažeme.
        </p>
        <p className="verox-muj-verox-intro-muted verox-font-myriad-regular my-4 uppercase tracking-[0.05em] text-[#303030]">
          INTERAKCE V KOMUNITĚ( PŘIDÁNÍ, REAKCE, NAHLÁŠENÍ ) JSOU DOSTOPNÉ POUZE PO PŘIHLÁŠENÍ.
        </p>
        <button
          type="button"
          onClick={() =>
            openLoginModal({
              reason: "Přihlaste se zdarma a zapojte se do diskuse diváků.",
            })
          }
          className="verox-muj-verox-cta-primary verox-font-myriad-regular mx-auto flex items-center justify-center bg-[#F37021] uppercase tracking-[0.05em] text-white"
        >
          PŘIHLÁSIT ZDARMA
        </button>
      </section>

      <VeroxDoubleDivider partial thick className="mb-6" />

      <section className="px-[3.55%]">
        <div className="verox-muj-verox-form-grid">
          <div className="verox-muj-verox-form-labels">
            <p className="verox-muj-verox-label verox-font-myriad-bold uppercase tracking-[0.05em] text-[#303030]">PŘEZDÍVKA</p>
            <div>
              <p className="verox-muj-verox-label verox-font-myriad-bold uppercase tracking-[0.05em] text-[#303030]">E-MAIL</p>
              <p className="verox-muj-verox-label verox-font-myriad-bold mt-0.5 text-[clamp(0.75rem,1.3vw,0.85rem)] uppercase tracking-[0.05em] text-[#303030]">
                ( volitelné, nezveřejňujeme )
              </p>
            </div>
            <p className="verox-muj-verox-label verox-font-myriad-bold uppercase tracking-[0.05em] text-[#303030]">VZKAZ</p>
          </div>

          <div className="verox-muj-verox-form-fields">
            <input
              type="text"
              value={authorName}
              onChange={(event) => setAuthorName(event.target.value)}
              placeholder="Vaše přezdívka"
              maxLength={60}
              className="verox-muj-verox-input verox-font-myriad-regular tracking-[0.05em] placeholder:text-[#717171]"
            />
            <input
              type="email"
              value={authorEmail}
              onChange={(event) => setAuthorEmail(event.target.value)}
              placeholder="vas@email.cz"
              maxLength={120}
              className="verox-muj-verox-input verox-font-myriad-regular tracking-[0.05em] placeholder:text-[#717171]"
            />
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Co chcete vzkázat redakci, nebo ostatním divákům ?"
              maxLength={1500}
              className="verox-muj-verox-textarea verox-font-myriad-regular tracking-[0.05em] placeholder:text-[#717171]"
            />
            <div className="verox-muj-verox-submit-row">
              <button
                type="button"
                disabled={submitting}
                onClick={() => void handleCreatePost()}
                className="verox-muj-verox-submit-btn verox-font-myriad-regular bg-[#F37021] uppercase tracking-[0.05em] text-white disabled:opacity-70"
              >
                {submitting ? "ODESÍLÁM…" : "PŘIDAT VZKAZ"}
              </button>
              <span className="verox-muj-verox-counter verox-font-myriad-regular tracking-[0.05em] text-[#717171]">
                {body.trim().length}/1500
              </span>
            </div>
          </div>
        </div>

        {submitInfo ? (
          <p className="verox-font-myriad-regular mt-3 pl-[33.8%] text-[clamp(0.85rem,1.5vw,0.95rem)] tracking-[0.05em] text-[#303030]">
            {submitInfo}
          </p>
        ) : null}
        {error ? (
          <p className="verox-font-myriad-regular mt-2 pl-[33.8%] text-[clamp(0.85rem,1.5vw,0.95rem)] tracking-[0.05em] text-[#D14A2A]">
            {error}
          </p>
        ) : null}
      </section>

      <VeroxDoubleDivider partial thick className="my-6" />

      <section className="px-[3.55%] pb-4">
        <div className="verox-muj-verox-pinned-grid">
          <div className="flex flex-col gap-[clamp(6px,1.8vw,10px)]">
            <button
              type="button"
              onClick={() => setSort("newest")}
              className={`verox-muj-verox-filter-btn verox-font-myriad-regular uppercase tracking-[0.05em] ${
                sort === "newest" ? "bg-[#F37021] text-white" : "bg-[#FFFFFF] text-[#303030]"
              }`}
            >
              NEJNOVĚJŠÍ
            </button>
            <button
              type="button"
              onClick={() => setSort("popular")}
              className={`verox-muj-verox-filter-btn verox-font-myriad-regular uppercase tracking-[0.05em] ${
                sort === "popular" ? "bg-[#F37021] text-white" : "bg-[#FFFFFF] text-[#303030]"
              }`}
            >
              POPULÁRNÍ
            </button>
          </div>

          <div className="min-w-0">
            <h2 className="verox-muj-verox-pinned-title verox-font-myriad-regular uppercase tracking-[0.05em] text-[#F37021]">
              PŘIPNUTÉ VZKAZY
            </h2>
            {loading ? (
              <p className="verox-muj-verox-empty-box verox-font-myriad-regular mt-2 tracking-[0.05em] text-[#717171]">Načítám…</p>
            ) : pinnedRoots.length === 0 ? (
              <p className="verox-muj-verox-empty-box verox-font-myriad-regular mt-2 tracking-[0.05em] text-[#717171]">{EMPTY_STATE_TEXT}</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {pinnedRoots.map((post) => (
                  <li key={post.id} className="verox-muj-verox-empty-box verox-font-myriad-regular border-[#717171]/40 tracking-[0.05em] text-[#303030]">
                    <p className="verox-font-myriad-bold text-[clamp(0.85rem,1.5vw,1rem)]">{post.author_name}</p>
                    <p className="mt-1 leading-[1.4]">{post.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

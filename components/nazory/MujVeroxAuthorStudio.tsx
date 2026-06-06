"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { AuthorProfileForm } from "@/components/nazory/AuthorProfileForm";
import { OpinionEditor } from "@/components/nazory/OpinionEditor";

type AuthorProfile = {
  firstName: string;
  lastName: string;
  slug: string;
  profileCompleted: boolean;
};

type AuthorArticleSummary = {
  id: string;
  title: string;
  status: "draft" | "published";
  slug: string;
  updatedAt: string;
  publishedAt: string | null;
};

type LoadedArticle = {
  id: string;
  title: string;
  perex: string;
  content_json: Record<string, unknown>;
  status: "draft" | "published";
  slug: string;
};

type StudioState =
  | { kind: "hidden" }
  | { kind: "loading" }
  | { kind: "profile"; profile: AuthorProfile }
  | { kind: "ready"; profile: AuthorProfile };

export function MujVeroxAuthorStudio() {
  const { isAuthenticated } = useAuth();
  const [studio, setStudio] = useState<StudioState>({ kind: "hidden" });
  const [articles, setArticles] = useState<AuthorArticleSummary[]>([]);
  const [articlesLoading, setArticlesLoading] = useState(false);
  const [editingArticle, setEditingArticle] = useState<LoadedArticle | null>(null);
  const [loadingArticleId, setLoadingArticleId] = useState<string | null>(null);
  const [editorKey, setEditorKey] = useState("new");

  const loadArticles = useCallback(async () => {
    setArticlesLoading(true);
    try {
      const response = await fetch("/api/nazory/articles", { credentials: "include", cache: "no-store" });
      if (!response.ok) {
        setArticles([]);
        return;
      }
      const payload = (await response.json()) as { articles?: AuthorArticleSummary[] };
      setArticles(Array.isArray(payload.articles) ? payload.articles : []);
    } catch {
      setArticles([]);
    } finally {
      setArticlesLoading(false);
    }
  }, []);

  const loadStudio = useCallback(async () => {
    setStudio({ kind: "loading" });
    try {
      const response = await fetch("/api/nazory/profile", { credentials: "include", cache: "no-store" });
      const payload = (await response.json()) as {
        profile?: AuthorProfile;
        error?: string;
      };

      if (response.status === 403 || response.status === 404) {
        setStudio({ kind: "hidden" });
        return;
      }

      if (!response.ok || !payload.profile) {
        setStudio({ kind: "hidden" });
        return;
      }

      if (!payload.profile.profileCompleted) {
        setStudio({ kind: "profile", profile: payload.profile });
        return;
      }

      setStudio({ kind: "ready", profile: payload.profile });
      await loadArticles();
    } catch {
      setStudio({ kind: "hidden" });
    }
  }, [loadArticles]);

  useEffect(() => {
    if (!isAuthenticated) {
      setStudio({ kind: "hidden" });
      setEditingArticle(null);
      setArticles([]);
      return;
    }
    void loadStudio();
  }, [isAuthenticated, loadStudio]);

  const openArticle = useCallback(async (articleId: string) => {
    setLoadingArticleId(articleId);
    try {
      const response = await fetch(`/api/nazory/articles/${encodeURIComponent(articleId)}`, {
        credentials: "include",
        cache: "no-store",
      });
      const payload = (await response.json()) as { article?: LoadedArticle };
      if (!response.ok || !payload.article) return;
      setEditingArticle(payload.article);
      setEditorKey(articleId);
    } finally {
      setLoadingArticleId(null);
    }
  }, []);

  const startNewArticle = useCallback(() => {
    setEditingArticle(null);
    setEditorKey(`new-${Date.now()}`);
  }, []);

  if (studio.kind === "hidden") {
    return null;
  }

  if (studio.kind === "loading") {
    return (
      <section className="mv-author-studio nazory-page" aria-labelledby="mv-author-studio">
        <p className="nazory-empty">Načítám autorskou sekci…</p>
      </section>
    );
  }

  if (studio.kind === "profile") {
    return (
      <section className="mv-author-studio nazory-page" aria-labelledby="mv-author-studio">
        <h2 id="mv-author-studio" className="mv-author-studio-heading">
          AUTORSKÝ PROFIL
        </h2>
        <p className="mv-author-studio-lead">
          Než začnete psát, dokončete svou autorskou kartu. Po uložení zde najdete editor článků.
        </p>
        <AuthorProfileForm
          redirectOnComplete={false}
          onProfileCompleted={() => {
            void loadStudio();
          }}
        />
      </section>
    );
  }

  const displayName = [studio.profile.firstName, studio.profile.lastName].filter(Boolean).join(" ");

  return (
    <section className="mv-author-studio nazory-page" aria-labelledby="mv-author-studio">
      <h2 id="mv-author-studio" className="mv-author-studio-heading">
        NAPSAT ČLÁNEK
      </h2>
      <p className="mv-author-studio-lead">
        Pište a publikujte své texty v sekci Názory. Koncept se ukládá automaticky.
        {displayName ? (
          <>
            {" "}
            Veřejná karta:{" "}
            <Link href={`/nazory/autor/${studio.profile.slug}`}>{displayName}</Link>
          </>
        ) : null}
      </p>

      <OpinionEditor
        key={editorKey}
        articleId={editingArticle?.id}
        initialTitle={editingArticle?.title ?? ""}
        initialPerex={editingArticle?.perex ?? ""}
        initialContent={editingArticle?.content_json}
        initialStatus={editingArticle?.status ?? "draft"}
        publishedSlug={editingArticle?.status === "published" ? editingArticle.slug : null}
        redirectOnCreate={false}
        previewPathPrefix="/nazory/nahled"
        onDraftSaved={() => {
          void loadArticles();
        }}
      />

      <div className="mv-author-articles">
        <div className="mv-author-articles-head">
          <h3>Moje články</h3>
          <button type="button" className="nazory-btn" onClick={startNewArticle}>
            Nový článek
          </button>
        </div>
        {articlesLoading ? (
          <p className="nazory-empty">Načítám články…</p>
        ) : articles.length === 0 ? (
          <p className="nazory-empty">Zatím nemáte žádné články. Začněte psát výše.</p>
        ) : (
          <ul className="mv-author-articles-list">
            {articles.map((article) => (
              <li key={article.id}>
                <button
                  type="button"
                  className="mv-author-articles-item"
                  disabled={loadingArticleId === article.id}
                  onClick={() => void openArticle(article.id)}
                >
                  <span className="mv-author-articles-title">
                    {article.title.trim() || "Bez názvu"}
                  </span>
                  <span className="mv-author-articles-meta">
                    {article.status === "published" ? "Publikováno" : "Koncept"}
                    {loadingArticleId === article.id ? " · načítám…" : ""}
                  </span>
                </button>
                {article.status === "published" ? (
                  <Link className="mv-author-articles-link" href={`/nazory/${article.slug}`}>
                    Zobrazit
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

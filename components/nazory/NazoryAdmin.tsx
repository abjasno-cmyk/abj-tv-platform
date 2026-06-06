"use client";

import { useCallback, useEffect, useState } from "react";

import type { AuthorProfileRow, OpinionArticleRow } from "@/lib/nazory/types";
import { getAuthorDisplayName } from "@/lib/nazory/display";

export function NazoryAdmin() {
  const [authors, setAuthors] = useState<AuthorProfileRow[]>([]);
  const [articles, setArticles] = useState<OpinionArticleRow[]>([]);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [authorsRes, articlesRes] = await Promise.all([
      fetch("/api/nazory/admin/authors", { credentials: "include", cache: "no-store" }),
      fetch("/api/nazory/admin/articles", { credentials: "include", cache: "no-store" }),
    ]);
    const authorsPayload = (await authorsRes.json()) as { authors?: AuthorProfileRow[]; error?: string };
    const articlesPayload = (await articlesRes.json()) as { articles?: OpinionArticleRow[]; error?: string };
    if (!authorsRes.ok) {
      setError(authorsPayload.error ?? "Nepodařilo se načíst autory.");
      return;
    }
    setAuthors(authorsPayload.authors ?? []);
    setArticles(articlesPayload.articles ?? []);
    setError(null);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const addAuthor = async () => {
    setMessage(null);
    setError(null);
    const response = await fetch("/api/nazory/admin/authors", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Autora se nepodařilo přidat.");
      return;
    }
    setEmail("");
    setMessage("Autor byl přidán.");
    await load();
  };

  const toggleAuthor = async (userId: string, isActive: boolean) => {
    await fetch("/api/nazory/admin/authors", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, isActive: !isActive }),
    });
    await load();
  };

  const articleAction = async (articleId: string, action: "hide" | "restore") => {
    await fetch("/api/nazory/admin/articles", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ articleId, action }),
    });
    await load();
  };

  return (
    <div className="nazory-admin">
      <section className="nazory-admin-section">
        <h2>Přidat autora</h2>
        <p className="nazory-form-lead">
          Zadejte Google e-mail. Uživatel se musí nejdřív jednou přihlásit přes Google Login.
        </p>
        <div className="nazory-admin-row">
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="autor@example.com"
          />
          <button type="button" className="nazory-btn nazory-btn-primary" onClick={() => void addAuthor()}>
            Přidat autora
          </button>
        </div>
      </section>

      <section className="nazory-admin-section">
        <h2>Autoři</h2>
        <ul className="nazory-admin-list">
          {authors.map((author) => (
            <li key={author.user_id}>
              <span>
                {getAuthorDisplayName(author)} ({author.slug}) — {author.is_active ? "aktivní" : "deaktivovaný"}
              </span>
              <button type="button" className="nazory-btn" onClick={() => void toggleAuthor(author.user_id, author.is_active)}>
                {author.is_active ? "Deaktivovat" : "Obnovit"}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="nazory-admin-section">
        <h2>Články</h2>
        <ul className="nazory-admin-list">
          {articles.map((article) => (
            <li key={article.id}>
              <span>
                {article.title || "Bez názvu"} — {article.status}
                {article.deleted_at ? " (skrytý)" : ""}
              </span>
              <span className="nazory-admin-actions">
                <a className="nazory-btn" href={`/nazory/napsat/${article.id}`}>
                  Upravit
                </a>
                {article.deleted_at ? (
                  <button type="button" className="nazory-btn" onClick={() => void articleAction(article.id, "restore")}>
                    Obnovit
                  </button>
                ) : (
                  <button type="button" className="nazory-btn" onClick={() => void articleAction(article.id, "hide")}>
                    Skrýt
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {error ? <p className="nazory-error">{error}</p> : null}
      {message ? <p className="nazory-success">{message}</p> : null}
    </div>
  );
}

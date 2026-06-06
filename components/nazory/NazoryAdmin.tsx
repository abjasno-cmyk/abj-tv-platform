"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import type { OpinionArticleRow } from "@/lib/nazory/types";

export function NazoryAdmin() {
  const [articles, setArticles] = useState<OpinionArticleRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/nazory/admin/articles", { credentials: "include", cache: "no-store" });
    const payload = (await response.json()) as { articles?: OpinionArticleRow[]; error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Nepodařilo se načíst články.");
      return;
    }
    setArticles(payload.articles ?? []);
    setError(null);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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
      <p className="nazory-form-lead">
        Globální přehled článků. Pro správu autorů a jejich textů použijte{" "}
        <Link href="/autori">sekci Autoři</Link>.
      </p>
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
                  <button type="button" className="nazory-btn nazory-btn-danger" onClick={() => void articleAction(article.id, "hide")}>
                    Smazat
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      </section>
      {error ? <p className="nazory-error">{error}</p> : null}
    </div>
  );
}

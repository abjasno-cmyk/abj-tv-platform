"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { formatNovinyDate, getVisibleArticlePerex, getVisibleArticleTitle } from "@/lib/noviny/public";
import type { NovinyArticleWithRelations, NovinyCategoryRow } from "@/lib/noviny/types";

type ArticlesResponse = {
  articles?: NovinyArticleWithRelations[];
  categories?: NovinyCategoryRow[];
  error?: string;
};

type FilterMode = "all" | "visible" | "hidden";

type ArticleDraft = {
  editedTitle: string;
  editedPerex: string;
  categoryId: string;
};

const FILTERS: Array<{ value: FilterMode; label: string }> = [
  { value: "all", label: "Vše" },
  { value: "visible", label: "Viditelné" },
  { value: "hidden", label: "Skryté" },
];

export function NovinyArticlesAdminClient() {
  const [articles, setArticles] = useState<NovinyArticleWithRelations[]>([]);
  const [categories, setCategories] = useState<NovinyCategoryRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, ArticleDraft>>({});
  const [filter, setFilter] = useState<FilterMode>("visible");
  const [loading, setLoading] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/noviny/articles", {
        credentials: "include",
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => ({}))) as ArticlesResponse;
      if (!response.ok) {
        throw new Error(payload.error ?? "Načtení článků selhalo.");
      }
      const nextArticles = payload.articles ?? [];
      setArticles(nextArticles);
      setCategories(payload.categories ?? []);
      setDrafts(
        Object.fromEntries(
          nextArticles.map((article) => [
            article.id,
            {
              editedTitle: article.edited_title ?? "",
              editedPerex: article.edited_perex ?? "",
              categoryId: article.category_id ?? "",
            },
          ]),
        ),
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Načtení článků selhalo.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredArticles = useMemo(() => {
    if (filter === "visible") return articles.filter((article) => !article.is_hidden);
    if (filter === "hidden") return articles.filter((article) => article.is_hidden);
    return articles;
  }, [articles, filter]);

  const saveArticle = async (articleId: string) => {
    const draft = drafts[articleId];
    if (!draft) return;
    setPendingId(articleId);
    setError(null);
    setStatus(null);
    try {
      const response = await fetch(`/api/admin/noviny/articles/${encodeURIComponent(articleId)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          editedTitle: draft.editedTitle,
          editedPerex: draft.editedPerex,
          categoryId: draft.categoryId || null,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Uložení článku selhalo.");
      }
      setStatus("Změny článku byly uloženy.");
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Uložení článku selhalo.");
    } finally {
      setPendingId(null);
    }
  };

  const toggleHidden = async (article: NovinyArticleWithRelations) => {
    setPendingId(article.id);
    setError(null);
    setStatus(null);
    try {
      const response = await fetch(`/api/admin/noviny/articles/${encodeURIComponent(article.id)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isHidden: !article.is_hidden }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Změna viditelnosti selhala.");
      }
      setStatus(article.is_hidden ? "Článek byl znovu zobrazen." : "Článek byl skryt.");
      await load();
    } catch (hideError) {
      setError(hideError instanceof Error ? hideError.message : "Změna viditelnosti selhala.");
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      <nav className="text-sm text-abj-text2">
        <Link href="/admin/noviny" className="font-semibold hover:text-abj-text1">
          ← Zpět na přehled Novin
        </Link>
      </nav>

      <header className="rounded-2xl border border-[var(--abj-gold-dim)] bg-abj-panel p-6">
        <p className="text-[11px] uppercase tracking-[0.14em] text-abj-text2">Admin · Noviny</p>
        <h1 className="mt-2 text-3xl font-semibold text-abj-text1">Správa článků</h1>
        <p className="mt-2 text-sm text-abj-text2">
          U každého článku můžete změnit titulek/perex, upravit kategorii nebo článek skrýt.
        </p>
      </header>

      <section className="flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setFilter(item.value)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] ${
              filter === item.value
                ? "border-[#FF6A00] bg-[rgba(255,106,0,0.1)] text-[#FF6A00]"
                : "border-[var(--abj-gold-dim)] text-abj-text2"
            }`}
          >
            {item.label}
          </button>
        ))}
      </section>

      {status ? <p className="text-sm text-[#2E6548]">{status}</p> : null}
      {error ? <p className="text-sm text-[#D14A2A]">{error}</p> : null}

      <section className="space-y-4">
        {loading ? (
          <p className="rounded-xl border border-[var(--abj-gold-dim)] bg-abj-panel px-4 py-4 text-sm text-abj-text2">
            Načítám články...
          </p>
        ) : filteredArticles.length === 0 ? (
          <p className="rounded-xl border border-[var(--abj-gold-dim)] bg-abj-panel px-4 py-4 text-sm text-abj-text2">
            Pro zvolený filtr nejsou články.
          </p>
        ) : (
          filteredArticles.map((article) => {
            const draft = drafts[article.id] ?? {
              editedTitle: "",
              editedPerex: "",
              categoryId: article.category_id ?? "",
            };
            return (
              <article key={article.id} className="rounded-2xl border border-[var(--abj-gold-dim)] bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold text-abj-text1">{getVisibleArticleTitle(article)}</h2>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${
                      article.is_hidden ? "bg-[rgba(209,74,42,0.12)] text-[#B13A22]" : "bg-[rgba(74,126,97,0.14)] text-[#2E6548]"
                    }`}
                  >
                    {article.is_hidden ? "Skrytý" : "Viditelný"}
                  </span>
                </div>

                <p className="mt-1 text-sm text-abj-text2">
                  {article.source?.name ?? "Neznámý zdroj"} · {formatNovinyDate(article.published_at)}
                </p>
                <p className="mt-2 text-sm text-abj-text1/90">{getVisibleArticlePerex(article) ?? "Perex není vyplněn."}</p>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <label className="space-y-1 text-sm">
                    <span className="font-medium text-abj-text1">Upravený titulek</span>
                    <input
                      value={draft.editedTitle}
                      onChange={(event) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [article.id]: {
                            ...draft,
                            editedTitle: event.target.value,
                          },
                        }))
                      }
                      className="w-full rounded-lg border border-[var(--abj-gold-dim)] px-3 py-2"
                      placeholder="Nechat prázdné = původní titulek"
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="font-medium text-abj-text1">Kategorie</span>
                    <select
                      value={draft.categoryId}
                      onChange={(event) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [article.id]: {
                            ...draft,
                            categoryId: event.target.value,
                          },
                        }))
                      }
                      className="w-full rounded-lg border border-[var(--abj-gold-dim)] px-3 py-2"
                    >
                      <option value="">Bez kategorie</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1 text-sm md:col-span-2">
                    <span className="font-medium text-abj-text1">Upravený perex</span>
                    <textarea
                      value={draft.editedPerex}
                      onChange={(event) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [article.id]: {
                            ...draft,
                            editedPerex: event.target.value,
                          },
                        }))
                      }
                      className="min-h-24 w-full rounded-lg border border-[var(--abj-gold-dim)] px-3 py-2"
                      placeholder="Nechat prázdné = původní perex"
                    />
                  </label>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={pendingId === article.id}
                    onClick={() => {
                      void saveArticle(article.id);
                    }}
                    className="rounded-lg border border-[#FF6A00]/35 bg-[#FF6A00]/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-[#B04A00] disabled:opacity-60"
                  >
                    Uložit úpravy
                  </button>
                  <button
                    type="button"
                    disabled={pendingId === article.id}
                    onClick={() => {
                      void toggleHidden(article);
                    }}
                    className="rounded-lg border border-[var(--abj-gold-dim)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-abj-text2 disabled:opacity-60"
                  >
                    {article.is_hidden ? "Zobrazit článek" : "Skrýt článek"}
                  </button>
                  <a
                    href={article.original_url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="rounded-lg border border-[var(--abj-gold-dim)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-abj-text2"
                  >
                    Otevřít originál
                  </a>
                </div>
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}

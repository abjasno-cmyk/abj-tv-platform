"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { getDictionary } from "@/lib/i18n/dictionary";
import { useLocale } from "@/lib/i18n/useLocale";

type SaveOpinionButtonProps = {
  articleId: string;
  title: string;
  slug: string;
  heroImagePath?: string | null;
  authorName?: string | null;
  saved?: boolean;
  onSavedChange?: (saved: boolean) => void;
  className?: string;
};

export function SaveOpinionButton({
  articleId,
  title,
  slug,
  heroImagePath,
  authorName,
  saved = false,
  onSavedChange,
  className,
}: SaveOpinionButtonProps) {
  const { isAuthenticated, requestAuth } = useAuth();
  const dictionary = getDictionary(useLocale());
  const [isSaved, setIsSaved] = useState(saved);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsSaved(saved);
  }, [saved]);

  const toggleSave = async () => {
    setLoading(true);
    setError(null);
    const method = isSaved ? "DELETE" : "POST";
    const url =
      method === "DELETE"
        ? `/api/viewer/saved-opinions?articleId=${encodeURIComponent(articleId)}`
        : "/api/viewer/saved-opinions";
    const response = await fetch(url, {
      method,
      headers: method === "POST" ? { "Content-Type": "application/json" } : undefined,
      body:
        method === "POST"
          ? JSON.stringify({
              articleId,
              title,
              slug,
              heroImagePath,
              authorName,
            })
          : undefined,
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    setLoading(false);
    if (!response.ok) {
      setError(payload.error ?? "Uložení se nepodařilo.");
      return;
    }
    const nextSaved = !isSaved;
    setIsSaved(nextSaved);
    onSavedChange?.(nextSaved);
  };

  return (
    <span className="nazory-save-wrap">
      <button
        type="button"
        className={className ?? `nazory-btn nazory-btn-save${isSaved ? " is-saved" : ""}`}
        disabled={loading}
        aria-pressed={isSaved}
        onClick={() => {
          if (!isAuthenticated) {
            requestAuth(() => {
              void toggleSave();
            }, { reason: dictionary.header.authReason.default });
            return;
          }
          void toggleSave();
        }}
      >
        <span aria-hidden="true">{isSaved ? "★" : "☆"}</span>
        {loading ? "…" : isSaved ? dictionary.common.saved : dictionary.common.saveArticle}
      </button>
      {error ? <span className="nazory-error nazory-save-error">{error}</span> : null}
    </span>
  );
}

"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { useSavedNoviny } from "@/app/noviny/_components/SavedNovinyProvider";

type SaveNovinyArticleButtonProps = {
  articleId: string;
  title: string;
  sourceName?: string | null;
  originalUrl: string;
  imageUrl?: string | null;
  publishedAt?: string | null;
  saved?: boolean;
  compact?: boolean;
  className?: string;
  onSavedChange?: (saved: boolean) => void;
};

export function SaveNovinyArticleButton({
  articleId,
  title,
  sourceName,
  originalUrl,
  imageUrl,
  publishedAt,
  saved = false,
  compact = false,
  className,
  onSavedChange,
}: SaveNovinyArticleButtonProps) {
  const { isAuthenticated, requestAuth } = useAuth();
  // Když je stránka obalená SavedNovinyProviderem, bere se stav odtud (jeden fetch
  // na celou stránku). Bez providera (např. Můj Verox) se použije lokální fallback.
  const savedCtx = useSavedNoviny();
  const [localSaved, setLocalSaved] = useState(saved);
  const isSaved = savedCtx ? savedCtx.isSaved(articleId) : localSaved;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Se providerem stav řeší on — žádný per-button fetch.
    if (savedCtx) return;
    if (!isAuthenticated) {
      const frame = window.requestAnimationFrame(() => setLocalSaved(false));
      return () => window.cancelAnimationFrame(frame);
    }
    let cancelled = false;
    void fetch("/api/viewer/saved-noviny", { cache: "no-store", credentials: "include" })
      .then(async (response) => {
        const payload = (await response.json().catch(() => ({}))) as { articles?: Array<{ articleId: string }> };
        if (!cancelled && response.ok) {
          setLocalSaved((payload.articles ?? []).some((article) => article.articleId === articleId));
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [articleId, isAuthenticated, savedCtx]);

  const toggleSave = async () => {
    setLoading(true);
    setError(null);
    const method = isSaved ? "DELETE" : "POST";
    const url =
      method === "DELETE"
        ? `/api/viewer/saved-noviny?articleId=${encodeURIComponent(articleId)}`
        : "/api/viewer/saved-noviny";
    const response = await fetch(url, {
      method,
      credentials: "include",
      headers: method === "POST" ? { "Content-Type": "application/json" } : undefined,
      body:
        method === "POST"
          ? JSON.stringify({
              articleId,
              title,
              sourceName,
              originalUrl,
              imageUrl,
              publishedAt,
            })
          : undefined,
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    setLoading(false);
    if (!response.ok) {
      setError(payload.error ?? "Uložení článku Novin se nepodařilo.");
      return;
    }
    const nextSaved = !isSaved;
    if (savedCtx) savedCtx.setSaved(articleId, nextSaved);
    else setLocalSaved(nextSaved);
    onSavedChange?.(nextSaved);
  };

  return (
    <span className="vx-save-video-wrap">
      <button
        type="button"
        className={
          className ??
          `vx-save-video${isSaved ? " is-saved" : ""}${compact ? " vx-save-video--compact" : ""}`
        }
        disabled={loading}
        aria-pressed={isSaved}
        aria-label={isSaved ? "Odebrat článek z uložených" : "Uložit článek na později"}
        title={isSaved ? "Odebrat článek z uložených" : "Uložit článek na později"}
        onClick={(event) => {
          event.stopPropagation();
          if (!isAuthenticated) {
            requestAuth(() => {
              void toggleSave();
            }, { reason: "Přihlaste se zdarma a uložte si článek na později." });
            return;
          }
          void toggleSave();
        }}
      >
        <span aria-hidden="true">{isSaved ? "★" : "☆"}</span>
        <span className={compact ? "vx-save-video-label vx-save-video-label--compact" : "vx-save-video-label"}>
          {loading ? "…" : isSaved ? "Uloženo" : "Uložit článek"}
        </span>
      </button>
      {error ? <span className="vx-save-video-error">{error}</span> : null}
    </span>
  );
}

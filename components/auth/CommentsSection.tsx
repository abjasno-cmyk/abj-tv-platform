"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/auth/AuthProvider";

type CommentsSectionProps = {
  entityType: string;
  entityId: string;
  heading?: string;
};

type ViewerComment = {
  id: string;
  userId: string;
  entityType: string;
  entityId: string;
  parentId: string | null;
  body: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  authorName: string;
  authorAvatarUrl: string | null;
};

type CommentsResponse = {
  comments?: ViewerComment[];
  error?: string;
};

function formatCommentDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "teď";
  return new Intl.DateTimeFormat("cs-CZ", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function CommentsSection({ entityType, entityId, heading = "Diskuse diváků" }: CommentsSectionProps) {
  const { user, isAuthenticated, requestAuth } = useAuth();
  const [comments, setComments] = useState<ViewerComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const loadComments = useCallback(async () => {
    if (!entityType || !entityId) return;
    setLoading(true);
    setError(null);
    const response = await fetch(
      `/api/viewer/comments?entityType=${encodeURIComponent(entityType)}&entityId=${encodeURIComponent(entityId)}`,
      { cache: "no-store" }
    );
    const payload = (await response.json().catch(() => ({}))) as CommentsResponse;
    if (!response.ok) {
      setLoading(false);
      setError(payload.error ?? "Komentáře se nepodařilo načíst.");
      return;
    }
    setComments(Array.isArray(payload.comments) ? payload.comments : []);
    setLoading(false);
  }, [entityId, entityType]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      void loadComments();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [loadComments]);

  const canSubmit = useMemo(() => draft.trim().length >= 2 && draft.trim().length <= 2000, [draft]);

  const addComment = async () => {
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    const response = await fetch("/api/viewer/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entityType,
        entityId,
        body: draft.trim(),
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      comment?: ViewerComment;
      error?: string;
    };
    setSaving(false);
    const createdComment = payload.comment;
    if (!response.ok || !createdComment) {
      setError(payload.error ?? "Komentář se nepodařilo uložit.");
      return;
    }

    setComments((prev) => [...prev, createdComment]);
    setDraft("");
  };

  const deleteComment = async (commentId: string) => {
    const response = await fetch(`/api/viewer/comments/${encodeURIComponent(commentId)}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      setError(payload.error ?? "Komentář se nepodařilo smazat.");
      return;
    }
    setComments((prev) => prev.filter((comment) => comment.id !== commentId));
  };

  return (
    <section className="rounded-[30px] border border-[rgba(17,17,17,0.12)] bg-white p-4 shadow-[0_16px_35px_rgba(17,17,17,0.08)] sm:p-5">
      <header className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-abj-text2">Reakce diváků</p>
          <h3 className="mt-1 text-lg font-black tracking-tight text-abj-text1">{heading}</h3>
        </div>
        <span className="rounded-full border border-[#F37021]/35 bg-[rgba(237,116,47,0.1)] px-3 py-1 text-xs font-semibold text-[#A5491D]">
          {comments.length} komentářů
        </span>
      </header>

      {!isAuthenticated ? (
        <div className="mb-4 rounded-2xl border border-[rgba(237,116,47,0.3)] bg-[rgba(237,116,47,0.1)] px-4 py-3 text-sm text-abj-text1">
          <p>Zapojte se do diskuse. Přihlášení je zdarma.</p>
          <button
            type="button"
            onClick={() =>
              requestAuth(
                () => {
                  // Intent is preserved and comment box becomes active after login.
                },
                {
                  reason: "Komentujte, lajkujte a pokračujte tam, kde jste skončili.",
                }
              )
            }
            className="mt-2 inline-flex min-h-10 items-center rounded-full border border-[#F37021] bg-[#F37021] px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-white hover:bg-[#d86625]"
          >
            Přihlásit zdarma
          </button>
        </div>
      ) : null}

      {isAuthenticated ? (
        <div className="mb-4 rounded-2xl border border-[rgba(17,17,17,0.12)] bg-[#FCFAF7] p-3">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Napište komentář..."
            className="w-full resize-y rounded-xl border border-[rgba(17,17,17,0.14)] bg-white px-3 py-2 text-sm text-abj-text1 outline-none focus:border-[#F37021]"
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-xs text-abj-text2">{draft.trim().length}/2000</span>
            <button
              type="button"
              disabled={!canSubmit || saving}
              onClick={() => {
                void addComment();
              }}
              className="inline-flex min-h-10 items-center rounded-full border border-[#F37021] bg-[#F37021] px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-white disabled:opacity-60"
            >
              {saving ? "Ukládám..." : "Přidat komentář"}
            </button>
          </div>
        </div>
      ) : null}

      {error ? <p className="mb-2 text-sm text-[#D14A2A]">{error}</p> : null}

      {loading ? (
        <p className="text-sm text-abj-text2">Načítám komentáře...</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-abj-text2">Diskuse je zatím prázdná.</p>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => (
            <article key={comment.id} className="rounded-2xl border border-[rgba(17,17,17,0.12)] bg-[#FCFAF7] p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-abj-text1">{comment.authorName}</p>
                <p className="text-xs text-abj-text2">{formatCommentDate(comment.createdAt)}</p>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-abj-text1">{comment.body}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="rounded-md border border-[var(--abj-gold-dim)] px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-abj-text2 opacity-70"
                  disabled
                  title="Moderace reportingu bude doplněna v další iteraci."
                >
                  Nahlásit (brzy)
                </button>
                {user?.id === comment.userId ? (
                  <button
                    type="button"
                    className="rounded-md border border-[var(--abj-gold-dim)] px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-abj-text2 hover:text-abj-text1"
                    onClick={() => {
                      void deleteComment(comment.id);
                    }}
                  >
                    Smazat
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

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
    <section className="rounded-[14px] border border-verox-line bg-white p-4 shadow-[0_16px_35px_rgba(17,17,17,0.08)] sm:p-5">
      <header className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="vx-kicker text-verox-orangeDeep">Reakce diváků</p>
          <h3 className="vx-display mt-1 text-verox-ink" style={{ fontSize: "1.25rem" }}>
            {heading}
          </h3>
        </div>
        <span className="vx-badge vx-badge--ink">{comments.length} komentářů</span>
      </header>

      {!isAuthenticated ? (
        <div className="mb-4 rounded-[12px] border border-verox-orange/40 bg-[#FBF8F2] px-4 py-3 text-sm text-verox-ink">
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
            className="vx-btn vx-btn--solid vx-btn--sm mt-2"
          >
            Přihlásit zdarma
          </button>
        </div>
      ) : null}

      {isAuthenticated ? (
        <div className="mb-4 rounded-[12px] border border-verox-line bg-[#FBF8F2] p-3">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Napište komentář..."
            className="w-full resize-y rounded-[10px] border border-verox-line bg-white px-3 py-2 text-sm text-verox-ink outline-none focus:border-verox-orange"
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="vx-meta">{draft.trim().length}/2000</span>
            <button
              type="button"
              disabled={!canSubmit || saving}
              onClick={() => {
                void addComment();
              }}
              className="vx-btn vx-btn--solid vx-btn--sm disabled:opacity-60"
            >
              {saving ? "Ukládám..." : "Přidat komentář"}
            </button>
          </div>
        </div>
      ) : null}

      {error ? <p className="mb-2 text-sm font-medium text-verox-orangeText">{error}</p> : null}

      {loading ? (
        <p className="vx-meta">Načítám komentáře...</p>
      ) : comments.length === 0 ? (
        <p className="vx-meta">Diskuse je zatím prázdná.</p>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => (
            <article key={comment.id} className="rounded-[12px] border border-verox-line bg-[#FBF8F2] p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-verox-ink">{comment.authorName}</p>
                <p className="vx-meta">{formatCommentDate(comment.createdAt)}</p>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-verox-charcoal">{comment.body}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="vx-btn vx-btn--ghost-ink vx-btn--sm opacity-60"
                  disabled
                  title="Moderace reportingu bude doplněna v další iteraci."
                >
                  Nahlásit (brzy)
                </button>
                {user?.id === comment.userId ? (
                  <button
                    type="button"
                    className="vx-btn vx-btn--ghost-ink vx-btn--sm"
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

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import {
  VIEWER_COMMENT_ENTITY_VIDEO,
  buildCommentTree,
  countVisibleComments,
  type CommentTreeNode,
  type ViewerCommentRecord,
} from "@/lib/viewer/comments";

type CommentsSectionProps = {
  entityType?: string;
  entityId: string | null;
  videoTitle?: string;
  scope?: "entity" | "global";
  heading?: string;
  compact?: boolean;
};

type CommentsResponse = {
  comments?: ViewerCommentRecord[];
  canModerate?: boolean;
  schemaReady?: boolean;
  error?: string;
};

const fetchOpts: RequestInit = { credentials: "include", cache: "no-store" };

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

function commentsQuery(scope: "entity" | "global", entityType: string, entityId: string | null): string {
  const params = new URLSearchParams({ entityType });
  if (scope === "global") {
    params.set("scope", "global");
  } else if (entityId) {
    params.set("entityId", entityId);
  }
  return `/api/viewer/comments?${params.toString()}`;
}

type CommentRowProps = {
  node: CommentTreeNode;
  depth: number;
  userId: string | null;
  canModerate: boolean;
  activeVideoId: string | null;
  showVideoContext: boolean;
  replyParentId: string | null;
  onReply: (parentId: string) => void;
  onCancelReply: () => void;
  onDeleteOwn: (commentId: string) => void;
  onModerate: (commentId: string, action: "hide" | "pin" | "unpin") => void;
};

function CommentRow({
  node,
  depth,
  userId,
  canModerate,
  activeVideoId,
  showVideoContext,
  replyParentId,
  onReply,
  onCancelReply,
  onDeleteOwn,
  onModerate,
}: CommentRowProps) {
  const isReplying = replyParentId === node.id;
  const isOwn = userId === node.userId;

  return (
    <article
      className={`vx-comment${node.isStaffHighlight ? " is-staff" : ""}${node.isPinned ? " is-pinned" : ""}`}
      style={{ marginLeft: depth > 0 ? `${Math.min(depth, 4) * 14}px` : undefined }}
    >
      <div className="vx-comment-head">
        <div className="vx-comment-meta">
          <p className="vx-comment-author">{node.authorName}</p>
          {node.isPinned ? <span className="vx-comment-pin">Připnuto</span> : null}
          {showVideoContext && node.entityId !== activeVideoId ? (
            <span className="vx-comment-video" title="Video">
              Video {node.entityId.slice(0, 8)}…
            </span>
          ) : null}
        </div>
        <time className="vx-comment-time" dateTime={node.createdAt}>
          {formatCommentDate(node.createdAt)}
        </time>
      </div>
      <p className="vx-comment-body">{node.body}</p>
      <div className="vx-comment-actions">
        <button type="button" className="vx-comment-action" onClick={() => onReply(node.id)}>
          Odpovědět
        </button>
        {isOwn ? (
          <button type="button" className="vx-comment-action" onClick={() => onDeleteOwn(node.id)}>
            Smazat
          </button>
        ) : null}
        {canModerate ? (
          <>
            <button
              type="button"
              className="vx-comment-action"
              onClick={() => onModerate(node.id, node.isPinned ? "unpin" : "pin")}
            >
              {node.isPinned ? "Odepnout" : "Připnout"}
            </button>
            <button type="button" className="vx-comment-action is-danger" onClick={() => onModerate(node.id, "hide")}>
              Skrýt
            </button>
          </>
        ) : null}
      </div>
      {isReplying ? (
        <button type="button" className="vx-comment-cancel-reply" onClick={onCancelReply}>
          Zrušit odpověď
        </button>
      ) : null}
      {node.replies.length > 0 ? (
        <div className="vx-comment-replies">
          {node.replies.map((reply) => (
            <CommentRow
              key={reply.id}
              node={reply}
              depth={depth + 1}
              userId={userId}
              canModerate={canModerate}
              activeVideoId={activeVideoId}
              showVideoContext={showVideoContext}
              replyParentId={replyParentId}
              onReply={onReply}
              onCancelReply={onCancelReply}
              onDeleteOwn={onDeleteOwn}
              onModerate={onModerate}
            />
          ))}
        </div>
      ) : null}
    </article>
  );
}

export function CommentsSection({
  entityType = VIEWER_COMMENT_ENTITY_VIDEO,
  entityId,
  videoTitle,
  scope = "entity",
  heading = "Diskuse diváků",
  compact = false,
}: CommentsSectionProps) {
  const { user, isAuthenticated, requestAuth } = useAuth();
  const [comments, setComments] = useState<ViewerCommentRecord[]>([]);
  const [canModerate, setCanModerate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [replyParentId, setReplyParentId] = useState<string | null>(null);
  const [schemaReady, setSchemaReady] = useState(true);

  const isGlobal = scope === "global";
  const canLoad = isGlobal || Boolean(entityId);

  const loadComments = useCallback(async () => {
    if (!canLoad) return;
    setLoading(true);
    setError(null);
    const response = await fetch(commentsQuery(isGlobal ? "global" : "entity", entityType, entityId), fetchOpts);
    const payload = (await response.json().catch(() => ({}))) as CommentsResponse;
    if (!response.ok) {
      setLoading(false);
      setError(payload.error ?? "Komentáře se nepodařilo načíst.");
      setSchemaReady(false);
      return;
    }
    setComments(Array.isArray(payload.comments) ? payload.comments : []);
    setCanModerate(Boolean(payload.canModerate));
    setSchemaReady(payload.schemaReady !== false);
    setLoading(false);
  }, [canLoad, entityId, entityType, isGlobal]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      void loadComments();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [loadComments]);

  useEffect(() => {
    if (!isAuthenticated) return;
    void fetch("/api/auth/bootstrap", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        termsAccepted: true,
        newsletterOptIn: false,
        source: "comments_panel",
      }),
    }).catch(() => {
      // Best-effort — komentáře fungují i bez profilu, ale bootstrap pomůže se jménem.
    });
  }, [isAuthenticated]);

  const tree = useMemo(() => buildCommentTree(comments), [comments]);
  const totalCount = useMemo(() => countVisibleComments(comments), [comments]);

  const composeEntityId = useMemo(() => {
    if (replyParentId) {
      const parent = comments.find((comment) => comment.id === replyParentId);
      return parent?.entityId ?? entityId;
    }
    return entityId;
  }, [comments, entityId, replyParentId]);

  const canSubmit = useMemo(() => draft.trim().length >= 2 && draft.trim().length <= 2000, [draft]);
  const canPost = Boolean(composeEntityId) && isAuthenticated && schemaReady;

  const addComment = async () => {
    if (!canSubmit || !composeEntityId) return;
    setSaving(true);
    setError(null);
    const response = await fetch("/api/viewer/comments", {
      ...fetchOpts,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entityType,
        entityId: composeEntityId,
        parentId: replyParentId,
        body: draft.trim(),
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      comment?: ViewerCommentRecord;
      error?: string;
    };
    setSaving(false);
    const createdComment = payload.comment;
    if (!response.ok || !createdComment) {
      if (response.status === 401) {
        setError("Přihlášení vypršelo nebo není vidět serveru. Přihlaste se prosím znovu.");
        requestAuth(() => undefined, { reason: "Pro uložení komentáře je potřeba přihlášení." });
        return;
      }
      setError(payload.error ?? "Komentář se nepodařilo uložit.");
      return;
    }

    setDraft("");
    setReplyParentId(null);
    await loadComments();
  };

  const deleteComment = async (commentId: string) => {
    const response = await fetch(`/api/viewer/comments/${encodeURIComponent(commentId)}`, {
      ...fetchOpts,
      method: "DELETE",
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      setError(payload.error ?? "Komentář se nepodařilo smazat.");
      return;
    }
    await loadComments();
  };

  const moderateComment = async (commentId: string, action: "hide" | "pin" | "unpin") => {
    const response = await fetch("/api/viewer/comments/moderate", {
      ...fetchOpts,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commentId, action }),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      removed?: boolean;
      comment?: ViewerCommentRecord;
      error?: string;
    };
    if (!response.ok) {
      setError(payload.error ?? "Moderace se nezdařila.");
      return;
    }
    if (payload.removed) {
      await loadComments();
      return;
    }
    if (payload.comment) {
      setComments((prev) => prev.map((comment) => (comment.id === commentId ? payload.comment! : comment)));
    }
  };

  const handleReply = (parentId: string) => {
    if (!isAuthenticated) {
      requestAuth(() => setReplyParentId(parentId), {
        reason: "Pro odpověď na komentář se přihlaste zdarma.",
      });
      return;
    }
    setReplyParentId(parentId);
  };

  const shellClass = compact ? "vx-comments vx-comments--compact" : "vx-comments";

  return (
    <section className={shellClass} aria-label={heading}>
      <header className="vx-comments-header">
        <div>
          <p className="vx-comments-kicker">Reakce diváků</p>
          <h3 className="vx-comments-title">{heading}</h3>
          {videoTitle && entityId ? <p className="vx-comments-context">K videu: {videoTitle}</p> : null}
          {isGlobal ? (
            <p className="vx-comments-context">Všechny komentáře napříč videi — nový příspěvek patří k právě sledovanému videu.</p>
          ) : null}
        </div>
        <span className="vx-comments-count">{totalCount} komentářů</span>
      </header>

      {!isAuthenticated ? (
        <div className="vx-comments-login">
          <p>Zapojte se do diskuse. Přihlášení je zdarma.</p>
          <button
            type="button"
            onClick={() =>
              requestAuth(() => undefined, {
                reason: "Komentujte, lajkujte a pokračujte tam, kde jste skončili.",
              })
            }
            className="vx-comments-login-btn"
          >
            Přihlásit zdarma
          </button>
        </div>
      ) : null}

      {isAuthenticated ? (
        <div className="vx-comments-compose">
          {replyParentId ? <p className="vx-comments-reply-hint">Odpovídáte na komentář</p> : null}
          {!composeEntityId ? (
            <p className="vx-comments-hint">
              Vyberte konkrétní video v sekci PRÁVĚ HRAJE nebo KANÁLY — pak zde můžete napsat komentář k němu.
            </p>
          ) : (
            <>
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                rows={compact ? 2 : 3}
                maxLength={2000}
                placeholder={replyParentId ? "Napište odpověď..." : "Napište komentář..."}
                className="vx-comments-input"
              />
              <div className="vx-comments-compose-bar">
                <span className="vx-comments-chars">{draft.trim().length}/2000</span>
                <button
                  type="button"
                  disabled={!canSubmit || saving || !canPost}
                  onClick={() => {
                    void addComment();
                  }}
                  className="vx-comments-submit"
                >
                  {saving ? "Ukládám..." : replyParentId ? "Odeslat odpověď" : "Přidat komentář"}
                </button>
              </div>
            </>
          )}
        </div>
      ) : null}

      {!schemaReady ? (
        <p className="vx-comments-schema">
          Databáze komentářů na tomto serveru ještě není připravená. Správce musí v Supabase spustit migrace{" "}
          <code>004_viewer_accounts.sql</code> a <code>008_comments_pinned.sql</code>.
        </p>
      ) : null}

      {error ? <p className="vx-comments-error">{error}</p> : null}

      {loading ? (
        <p className="vx-comments-empty">Načítám komentáře...</p>
      ) : tree.length === 0 ? (
        <p className="vx-comments-empty">Diskuse je zatím prázdná. Buďte první.</p>
      ) : (
        <div className="vx-comments-list">
          {tree.map((node) => (
            <CommentRow
              key={node.id}
              node={node}
              depth={0}
              userId={user?.id ?? null}
              canModerate={canModerate}
              activeVideoId={entityId}
              showVideoContext={isGlobal}
              replyParentId={replyParentId}
              onReply={handleReply}
              onCancelReply={() => setReplyParentId(null)}
              onDeleteOwn={(id) => {
                void deleteComment(id);
              }}
              onModerate={(id, action) => {
                void moderateComment(id, action);
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}

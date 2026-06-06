"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { CommentLikeButton } from "@/components/auth/CommentLikeButton";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  VIEWER_COMMENT_ENTITY_VIDEO,
  buildCommentTree,
  countThreadReplies,
  countVisibleComments,
  sortCommentRoots,
  type CommentFilterMode,
  type CommentSortMode,
  type CommentTreeNode,
  type ViewerCommentRecord,
} from "@/lib/viewer/comments";
import { authorInitials, formatRelativeCommentTime } from "@/lib/viewer/commentTime";

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
const REPLIES_PREVIEW_COUNT = 2;

function commentsQuery(
  scope: "entity" | "global",
  entityType: string,
  entityId: string | null,
): string {
  const params = new URLSearchParams({ entityType, sort: "popular", filter: "all" });
  if (scope === "global") {
    params.set("scope", "global");
  } else if (entityId) {
    params.set("entityId", entityId);
  }
  return `/api/viewer/comments?${params.toString()}`;
}

type CommentCardProps = {
  node: CommentTreeNode;
  isReply?: boolean;
  userId: string | null;
  canModerate: boolean;
  activeVideoId: string | null;
  showVideoContext: boolean;
  replyParentId: string | null;
  onReply: (parentId: string, authorName: string) => void;
  onDeleteOwn: (commentId: string) => void;
  onModerate: (commentId: string, action: "hide" | "pin" | "unpin") => void;
};

function CommentAvatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img className="vx-comment-avatar vx-comment-avatar--image" src={avatarUrl} alt="" />
    );
  }
  return <span className="vx-comment-avatar">{authorInitials(name)}</span>;
}

function CommentCard({
  node,
  isReply = false,
  userId,
  canModerate,
  activeVideoId,
  showVideoContext,
  replyParentId,
  onReply,
  onDeleteOwn,
  onModerate,
}: CommentCardProps) {
  const isOwn = userId === node.userId;
  const replyCount = countThreadReplies(node);
  const isReplyingHere = replyParentId === node.id;

  return (
    <article
      className={`vx-comment${isReply ? " vx-comment--reply" : ""}${node.isStaffHighlight ? " is-staff" : ""}${node.isPinned ? " is-pinned" : ""}`}
    >
      <div className="vx-comment-layout">
        <CommentAvatar name={node.authorName} avatarUrl={node.authorAvatarUrl} />
        <div className="vx-comment-main">
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
              {formatRelativeCommentTime(node.createdAt)}
            </time>
          </div>

          {node.replyToAuthorName ? (
            <p className="vx-comment-reply-target">
              <span aria-hidden="true">↳</span> {node.replyToAuthorName}
            </p>
          ) : null}

          <p className="vx-comment-body">{node.body}</p>

          <div className="vx-comment-footer">
            <div className="vx-comment-metrics">
              {replyCount > 0 && !isReply ? (
                <span className="vx-comment-metric" aria-label={`${replyCount} odpovědí`}>
                  <span className="vx-comment-metric-icon" aria-hidden="true">
                    💬
                  </span>
                  {replyCount}
                </span>
              ) : null}
              <CommentLikeButton
                commentId={node.id}
                initialCount={node.likeCount}
                initialLiked={node.likedByMe}
              />
            </div>
            <button type="button" className="vx-comment-reply-btn" onClick={() => onReply(node.id, node.authorName)}>
              Odpovědět
            </button>
          </div>

          {(isOwn || canModerate) && (
            <div className="vx-comment-moderation">
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
          )}

          {isReplyingHere ? (
            <p className="vx-comment-replying-here">Píšete odpověď tomuto komentáři výše.</p>
          ) : null}
        </div>
      </div>
    </article>
  );
}

type CommentThreadProps = {
  node: CommentTreeNode;
  userId: string | null;
  canModerate: boolean;
  activeVideoId: string | null;
  showVideoContext: boolean;
  replyParentId: string | null;
  onReply: (parentId: string, authorName: string) => void;
  onDeleteOwn: (commentId: string) => void;
  onModerate: (commentId: string, action: "hide" | "pin" | "unpin") => void;
};

type ReplyBranchProps = Omit<CommentThreadProps, "node"> & { reply: CommentTreeNode };

function ReplyBranch({
  reply,
  userId,
  canModerate,
  activeVideoId,
  showVideoContext,
  replyParentId,
  onReply,
  onDeleteOwn,
  onModerate,
}: ReplyBranchProps) {
  return (
    <>
      <CommentCard
        node={reply}
        isReply
        userId={userId}
        canModerate={canModerate}
        activeVideoId={activeVideoId}
        showVideoContext={showVideoContext}
        replyParentId={replyParentId}
        onReply={onReply}
        onDeleteOwn={onDeleteOwn}
        onModerate={onModerate}
      />
      {reply.replies.map((child) => (
        <ReplyBranch
          key={child.id}
          reply={child}
          userId={userId}
          canModerate={canModerate}
          activeVideoId={activeVideoId}
          showVideoContext={showVideoContext}
          replyParentId={replyParentId}
          onReply={onReply}
          onDeleteOwn={onDeleteOwn}
          onModerate={onModerate}
        />
      ))}
    </>
  );
}

function CommentThread(props: CommentThreadProps) {
  const { node, ...rest } = props;
  const [expanded, setExpanded] = useState(false);
  const hiddenCount = Math.max(0, node.replies.length - REPLIES_PREVIEW_COUNT);
  const visibleReplies = expanded ? node.replies : node.replies.slice(0, REPLIES_PREVIEW_COUNT);

  return (
    <div className="vx-thread">
      <CommentCard node={node} {...rest} />
      {node.replies.length > 0 ? (
        <div className="vx-thread-replies">
          <div className="vx-thread-line" aria-hidden="true" />
          <div className="vx-thread-reply-list">
            {visibleReplies.map((reply) => (
              <ReplyBranch key={reply.id} reply={reply} {...rest} />
            ))}
            {hiddenCount > 0 && !expanded ? (
              <button type="button" className="vx-thread-more" onClick={() => setExpanded(true)}>
                Zobrazit další reakce ({hiddenCount})
                <span aria-hidden="true"> ▾</span>
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
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
  const [replyTargetName, setReplyTargetName] = useState<string | null>(null);
  const [schemaReady, setSchemaReady] = useState(true);
  const [filter, setFilter] = useState<CommentFilterMode>("all");
  const [sort, setSort] = useState<CommentSortMode>("popular");

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
      // Best-effort.
    });
  }, [isAuthenticated]);

  const visibleComments = useMemo(
    () =>
      filter === "mine" && user
        ? comments.filter((comment) => comment.userId === user.id)
        : comments,
    [comments, filter, user],
  );
  const tree = useMemo(
    () => sortCommentRoots(buildCommentTree(visibleComments), sort),
    [visibleComments, sort],
  );
  const totalCount = useMemo(() => countVisibleComments(comments), [comments]);
  const myCount = useMemo(
    () => (user ? comments.filter((comment) => comment.userId === user.id).length : 0),
    [comments, user],
  );

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
    if (!response.ok || !payload.comment) {
      if (response.status === 401) {
        setError("Přihlášení vypršelo. Přihlaste se prosím znovu.");
        requestAuth(() => undefined, { reason: "Pro uložení komentáře je potřeba přihlášení." });
        return;
      }
      setError(payload.error ?? "Komentář se nepodařilo uložit.");
      return;
    }

    setDraft("");
    setReplyParentId(null);
    setReplyTargetName(null);
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

  const handleReply = (parentId: string, authorName: string) => {
    if (!isAuthenticated) {
      requestAuth(() => {
        setReplyParentId(parentId);
        setReplyTargetName(authorName);
      }, {
        reason: "Pro odpověď na komentář se přihlaste zdarma.",
      });
      return;
    }
    setReplyParentId(parentId);
    setReplyTargetName(authorName);
  };

  const shellClass = compact ? "vx-comments vx-comments--compact" : "vx-comments";

  return (
    <section className={shellClass} aria-label={heading}>
      <header className="vx-comments-header">
        <div>
          <p className="vx-comments-kicker">Diskuse</p>
          <h3 className="vx-comments-title">{heading}</h3>
          {videoTitle && entityId ? <p className="vx-comments-context">K videu: {videoTitle}</p> : null}
          {isGlobal ? (
            <p className="vx-comments-context">
              Všechny komentáře napříč videi — nový příspěvek patří k právě sledovanému videu.
            </p>
          ) : null}
        </div>
      </header>

      <div className="vx-comments-toolbar" role="toolbar" aria-label="Filtry diskuse">
        <div className="vx-comments-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={filter === "all"}
            className={filter === "all" ? "is-active" : undefined}
            onClick={() => setFilter("all")}
          >
            Vše <span className="vx-comments-tab-count">{totalCount}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filter === "mine"}
            className={filter === "mine" ? "is-active" : undefined}
            onClick={() => setFilter("mine")}
            disabled={!isAuthenticated}
          >
            Moje komentáře <span className="vx-comments-tab-count">{myCount}</span>
          </button>
        </div>
        <label className="vx-comments-sort">
          <span className="sr-only">Řazení komentářů</span>
          <select value={sort} onChange={(event) => setSort(event.target.value as CommentSortMode)}>
            <option value="popular">Od nejlepších</option>
            <option value="newest">Od nejnovějších</option>
          </select>
        </label>
      </div>

      {!isAuthenticated ? (
        <div className="vx-comments-login">
          <p>Zapojte se do diskuse. Přihlášení je zdarma.</p>
          <button
            type="button"
            onClick={() =>
              requestAuth(() => undefined, {
                reason: "Komentujte, reagujte a pokračujte tam, kde jste skončili.",
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
          {replyParentId && replyTargetName ? (
            <p className="vx-comments-reply-hint">
              Odpovídáte uživateli <strong>{replyTargetName}</strong>
              <button
                type="button"
                className="vx-comments-reply-cancel"
                onClick={() => {
                  setReplyParentId(null);
                  setReplyTargetName(null);
                }}
              >
                Zrušit
              </button>
            </p>
          ) : null}
          {!composeEntityId ? (
            <p className="vx-comments-hint">
              Vyberte konkrétní video v sekci PRÁVĚ HRAJE nebo KANÁLY — pak zde můžete napsat komentář k němu.
            </p>
          ) : (
            <>
              <div className="vx-comments-compose-row">
                <span className="vx-comment-avatar vx-comment-avatar--compose" aria-hidden="true">
                  {authorInitials(user?.email?.split("@")[0] ?? "VY")}
                </span>
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  rows={compact ? 2 : 3}
                  maxLength={2000}
                  placeholder={replyParentId ? "Napište odpověď..." : "Napište komentář"}
                  className="vx-comments-input"
                />
              </div>
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
          Databáze komentářů na tomto serveru ještě není připravená. Spusťte migrace{" "}
          <code>004_viewer_accounts.sql</code> a <code>008_comments_pinned.sql</code>.
        </p>
      ) : null}

      {error ? <p className="vx-comments-error">{error}</p> : null}

      {loading ? (
        <p className="vx-comments-empty">Načítám komentáře...</p>
      ) : tree.length === 0 ? (
        <p className="vx-comments-empty">
          {filter === "mine" ? "Zatím jste nenapsali žádný komentář." : "Diskuse je zatím prázdná. Buďte první."}
        </p>
      ) : (
        <div className="vx-comments-list">
          {tree.map((node) => (
            <CommentThread
              key={node.id}
              node={node}
              userId={user?.id ?? null}
              canModerate={canModerate}
              activeVideoId={entityId}
              showVideoContext={isGlobal}
              replyParentId={replyParentId}
              onReply={handleReply}
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

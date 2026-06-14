"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { formatRelativeCommentTime } from "@/lib/viewer/commentTime";
import type { MyVeroxEngagementPayload, MyVeroxNotificationItem } from "@/lib/viewer/commentEngagementTypes";

const fetchOpts: RequestInit = { credentials: "include", cache: "no-store" };

function notificationLabel(item: MyVeroxNotificationItem): string {
  if (item.type === "comment_liked") {
    return item.actorName
      ? `${item.actorName} reagoval na váš komentář`
      : "Někdo reagoval na váš komentář";
  }
  return item.actorName
    ? `${item.actorName} odpověděl na váš komentář`
    : "Někdo odpověděl na váš komentář";
}

export function MyVeroxEngagement() {
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [engagement, setEngagement] = useState<MyVeroxEngagementPayload | null>(null);

  const loadEngagement = useCallback(async () => {
    if (!isAuthenticated) {
      setEngagement(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/viewer/notifications", fetchOpts);
      const payload = (await response.json().catch(() => ({}))) as MyVeroxEngagementPayload & {
        error?: string;
      };
      if (!response.ok) {
        setEngagement(null);
        return;
      }
      setEngagement({
        unreadCount: payload.unreadCount ?? 0,
        notifications: Array.isArray(payload.notifications) ? payload.notifications : [],
        recentComments: Array.isArray(payload.recentComments) ? payload.recentComments : [],
      });
    } catch {
      setEngagement(null);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void loadEngagement();
  }, [loadEngagement]);

  const markAllRead = useCallback(async () => {
    await fetch("/api/viewer/notifications", {
      ...fetchOpts,
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAll: true }),
    }).catch(() => undefined);
    await loadEngagement();
  }, [loadEngagement]);

  if (!isAuthenticated) return null;

  const hasNotifications = (engagement?.notifications.length ?? 0) > 0;
  const hasComments = (engagement?.recentComments.length ?? 0) > 0;
  if (!loading && !hasNotifications && !hasComments) return null;

  return (
    <section className="mv-engagement" aria-label="Vaše komentáře a reakce">
      <div className="mv-engagement-head">
        <div>
          <h2 className="mv-engagement-title">Vaše hlas v diskusi</h2>
          <p className="mv-engagement-lead">
            Děkujeme, že komentujete — tady vidíte, jak na vaše příspěvky reaguje komunita.
          </p>
        </div>
        {(engagement?.unreadCount ?? 0) > 0 ? (
          <button type="button" className="mv-engagement-mark-read" onClick={() => void markAllRead()}>
            Označit vše jako přečtené
          </button>
        ) : null}
      </div>

      {loading ? (
        <p className="mv-engagement-empty">Načítám vaši aktivitu…</p>
      ) : (
        <>
          {hasNotifications ? (
            <div className="mv-engagement-block">
              <h3 className="mv-engagement-subtitle">
                Reakce na vás
                {(engagement?.unreadCount ?? 0) > 0 ? (
                  <span className="mv-engagement-badge">{engagement?.unreadCount}</span>
                ) : null}
              </h3>
              <ul className="mv-engagement-list">
                {engagement?.notifications.map((item) => (
                  <li key={item.id} className={item.read ? "is-read" : "is-unread"}>
                    <Link href={item.href} className="mv-engagement-item">
                      <span className="mv-engagement-item-label">{notificationLabel(item)}</span>
                      {item.commentExcerpt ? (
                        <span className="mv-engagement-item-excerpt">„{item.commentExcerpt}"</span>
                      ) : null}
                      <time className="mv-engagement-item-time" dateTime={item.createdAt}>
                        {formatRelativeCommentTime(item.createdAt)}
                      </time>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {hasComments ? (
            <div className="mv-engagement-block">
              <h3 className="mv-engagement-subtitle">Vaše nedávné komentáře</h3>
              <ul className="mv-engagement-list">
                {engagement?.recentComments.map((comment) => (
                  <li key={comment.id}>
                    <Link href={comment.href} className="mv-engagement-item">
                      <span className="mv-engagement-item-excerpt">„{comment.body.trim().slice(0, 140)}
                        {comment.body.trim().length > 140 ? "…" : ""}"</span>
                      <span className="mv-engagement-item-stats">
                        {comment.likeCount > 0 ? `${comment.likeCount} reakcí` : "Zatím bez reakcí"}
                        {comment.replyCount > 0 ? ` · ${comment.replyCount} odpovědí` : ""}
                      </span>
                      <time className="mv-engagement-item-time" dateTime={comment.createdAt}>
                        {formatRelativeCommentTime(comment.createdAt)}
                      </time>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { buildAutoThankReply } from "@/lib/viewer/autoThank";
import { isStaffCommentAuthor } from "@/lib/viewer/commentsStaff";
import { VIEWER_COMMENT_ENTITY_OPINION } from "@/lib/viewer/comments";
import { loadCommentLikeStats } from "@/lib/viewer/commentLikes";
import { insertComment } from "@/lib/viewer/commentsDb";
import { loadCommentAuthorProfiles } from "@/lib/viewer/profileLookup";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { buildCommentEngagementHref } from "@/lib/viewer/commentLinks";
import type {
  MyVeroxEngagementPayload,
  MyVeroxNotificationItem,
  MyVeroxRecentComment,
} from "@/lib/viewer/commentEngagementTypes";

export type {
  CommentEngagementResponse,
  MyVeroxEngagementPayload,
  MyVeroxNotificationItem,
  MyVeroxRecentComment,
} from "@/lib/viewer/commentEngagementTypes";

const STAFF_AUTO_THANK_EMAIL = "abjasno@gmail.com";
const AUTO_THANK_DAILY_LIMIT = 3;
const ENGAGEMENT_COMMENT_LIMIT = 12;
const NOTIFICATION_LIMIT = 20;

type CommentRow = {
  id: string;
  user_id: string;
  entity_type: string;
  entity_id: string;
  parent_id: string | null;
  body: string;
  created_at: string;
};

function excerpt(body: string, max = 120): string {
  const trimmed = body.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function isNotificationsTableMissing(error: { message?: string } | null | undefined): boolean {
  const message = error?.message ?? "";
  return /relation .*user_notifications.* does not exist/i.test(message);
}

async function loadOpinionSlugs(
  supabase: SupabaseClient,
  articleIds: string[],
): Promise<Map<string, string>> {
  const unique = Array.from(new Set(articleIds.filter(Boolean)));
  if (unique.length === 0) return new Map();

  const { data } = await supabase.from("opinion_articles").select("id, slug").in("id", unique);
  const map = new Map<string, string>();
  for (const row of (data ?? []) as Array<{ id: string; slug: string | null }>) {
    const slug = row.slug?.trim();
    if (slug) map.set(row.id, slug);
  }
  return map;
}

async function resolveHrefMap(
  supabase: SupabaseClient,
  rows: Array<{ entity_type: string; entity_id: string }>,
): Promise<Map<string, string>> {
  const opinionIds = rows
    .filter((row) => row.entity_type === VIEWER_COMMENT_ENTITY_OPINION)
    .map((row) => row.entity_id);
  const opinionSlugs = await loadOpinionSlugs(supabase, opinionIds);
  const hrefByEntity = new Map<string, string>();

  for (const row of rows) {
    const key = `${row.entity_type}:${row.entity_id}`;
    if (hrefByEntity.has(key)) continue;
    const slug = row.entity_type === VIEWER_COMMENT_ENTITY_OPINION ? opinionSlugs.get(row.entity_id) : null;
    hrefByEntity.set(key, buildCommentEngagementHref(row.entity_type, row.entity_id, slug));
  }
  return hrefByEntity;
}

export async function notifyCommentAuthor(
  input: {
    recipientUserId: string;
    actorUserId: string;
    commentId: string;
    entityType: string;
    entityId: string;
    commentBody: string;
    type: "comment_liked" | "comment_replied";
  },
): Promise<void> {
  if (input.recipientUserId === input.actorUserId) return;

  let service;
  try {
    service = createSupabaseServiceClient();
  } catch {
    return;
  }

  const profiles = await loadCommentAuthorProfiles(service, [input.actorUserId]);
  const actor = profiles.get(input.actorUserId);

  const insert = await service.from("user_notifications").insert({
    user_id: input.recipientUserId,
    type: input.type,
    actor_user_id: input.actorUserId,
    comment_id: input.commentId,
    entity_type: input.entityType,
    entity_id: input.entityId,
    metadata: {
      actor_name: actor?.display_name ?? "Divák VEROX",
      comment_excerpt: excerpt(input.commentBody),
    },
  });

  if (insert.error && !isNotificationsTableMissing(insert.error)) {
    console.error("comment-notification-insert-failed", insert.error.message);
  }
}

async function countRecentAutoThanks(service: SupabaseClient, userId: string): Promise<number> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error } = await service
    .from("viewer_activity")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("event_type", "auto_thank_sent")
    .gte("created_at", since);

  if (error) return AUTO_THANK_DAILY_LIMIT;
  return count ?? 0;
}

async function resolveAutoThankStaffUserId(service: SupabaseClient): Promise<string | null> {
  const { data } = await service.from("profiles").select("id, email, role").eq("email", STAFF_AUTO_THANK_EMAIL).maybeSingle();
  if (!data?.id) return null;
  return data.id as string;
}

export async function maybeSendAutoThank(
  supabase: SupabaseClient,
  comment: CommentRow,
  commenterProfile: { email: string | null; role: string | null } | null,
): Promise<void> {
  if (comment.parent_id) return;
  if (isStaffCommentAuthor(commenterProfile)) return;

  let service;
  try {
    service = createSupabaseServiceClient();
  } catch {
    return;
  }

  const recentCount = await countRecentAutoThanks(service, comment.user_id);
  if (recentCount >= AUTO_THANK_DAILY_LIMIT) return;

  const staffUserId = await resolveAutoThankStaffUserId(service);
  if (!staffUserId) return;

  try {
    await insertComment(service, {
      user_id: staffUserId,
      entity_type: comment.entity_type,
      entity_id: comment.entity_id,
      parent_id: comment.id,
      body: buildAutoThankReply(comment.body),
    });

    await service.from("viewer_activity").insert({
      user_id: comment.user_id,
      event_type: "auto_thank_sent",
      entity_type: comment.entity_type,
      entity_id: comment.entity_id,
      metadata: { comment_id: comment.id },
    });
  } catch (error) {
    console.error("auto-thank-failed", error);
  }
}

export async function loadMyVeroxEngagementForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<MyVeroxEngagementPayload> {
  const [commentsRes, notificationsRes] = await Promise.all([
    supabase
      .from("comments")
      .select("id, user_id, entity_type, entity_id, parent_id, body, created_at")
      .eq("user_id", userId)
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(ENGAGEMENT_COMMENT_LIMIT),
    supabase
      .from("user_notifications")
      .select("id, type, actor_user_id, comment_id, entity_type, entity_id, metadata, read_at, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(NOTIFICATION_LIMIT),
  ]);

  const commentRows = (commentsRes.data ?? []) as CommentRow[];
  const hrefByEntity = await resolveHrefMap(supabase, commentRows);

  const commentIds = commentRows.map((row) => row.id);
  const likeStats = await loadCommentLikeStats(commentIds, userId);

  let replyCountByParent = new Map<string, number>();
  if (commentIds.length > 0) {
    const repliesRes = await supabase
      .from("comments")
      .select("parent_id")
      .in("parent_id", commentIds)
      .eq("status", "published");
    for (const row of (repliesRes.data ?? []) as Array<{ parent_id: string | null }>) {
      const parentId = row.parent_id?.trim();
      if (!parentId) continue;
      replyCountByParent.set(parentId, (replyCountByParent.get(parentId) ?? 0) + 1);
    }
  }

  const recentComments: MyVeroxRecentComment[] = commentRows.map((row) => ({
    id: row.id,
    body: row.body,
    entityType: row.entity_type,
    entityId: row.entity_id,
    href: hrefByEntity.get(`${row.entity_type}:${row.entity_id}`) ?? "/muj-verox",
    likeCount: likeStats.get(row.id)?.likeCount ?? 0,
    replyCount: replyCountByParent.get(row.id) ?? 0,
    createdAt: row.created_at,
  }));

  if (notificationsRes.error) {
    if (isNotificationsTableMissing(notificationsRes.error)) {
      return { unreadCount: 0, notifications: [], recentComments };
    }
    throw notificationsRes.error;
  }

  const notificationRows = notificationsRes.data ?? [];
  const notificationEntities = notificationRows.map((row) => ({
    entity_type: (row.entity_type as string | null) ?? "",
    entity_id: (row.entity_id as string | null) ?? "",
  }));
  const notificationHrefByEntity = await resolveHrefMap(supabase, notificationEntities);

  const actorIds = notificationRows
    .map((row) => row.actor_user_id)
    .filter((value): value is string => typeof value === "string");
  const actorProfiles = await loadCommentAuthorProfiles(supabase, actorIds);

  const notifications: MyVeroxNotificationItem[] = notificationRows.map((row) => {
    const metadata = (row.metadata ?? {}) as Record<string, unknown>;
    const actorName =
      (typeof metadata.actor_name === "string" ? metadata.actor_name : null) ??
      actorProfiles.get(row.actor_user_id as string)?.display_name ??
      null;
    const entityType = (row.entity_type as string | null) ?? "";
    const entityId = (row.entity_id as string | null) ?? "";
    return {
      id: row.id as string,
      type: row.type as MyVeroxNotificationItem["type"],
      actorName,
      commentExcerpt:
        typeof metadata.comment_excerpt === "string" ? metadata.comment_excerpt : "",
      entityType,
      entityId,
      href: notificationHrefByEntity.get(`${entityType}:${entityId}`) ?? "/muj-verox",
      createdAt: row.created_at as string,
      read: Boolean(row.read_at),
    };
  });

  const unreadCount = notifications.filter((item) => !item.read).length;

  return { unreadCount, notifications, recentComments };
}

export async function markNotificationsRead(
  supabase: SupabaseClient,
  userId: string,
  notificationIds?: string[],
): Promise<number> {
  const now = new Date().toISOString();
  let query = supabase
    .from("user_notifications")
    .update({ read_at: now })
    .eq("user_id", userId)
    .is("read_at", null);

  if (notificationIds && notificationIds.length > 0) {
    query = query.in("id", notificationIds);
  }

  const result = await query.select("id");
  if (result.error) {
    if (isNotificationsTableMissing(result.error)) return 0;
    throw result.error;
  }
  return result.data?.length ?? 0;
}

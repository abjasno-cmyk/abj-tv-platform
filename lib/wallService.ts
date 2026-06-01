import "server-only";

import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";
import { moderateWallPost } from "@/lib/wallModerationService";
import { sanitizeWallText } from "@/lib/wallSecurity";
import type {
  CreateWallPostInput,
  WallIdentityMeta,
  WallPost,
  WallPostCreateResult,
  WallPostListResult,
  WallSort,
  WallStatus,
} from "@/lib/wallTypes";

// Zeď běží přes service_role klíč (obchází RLS server-side; veškerá validace a
// moderace je v této vrstvě). Když klíč není k dispozici, gracefully spadne na
// běžný server klient (čtení dál funguje, zápis bude blokovaný RLS jako dřív).
async function getWallClient() {
  try {
    return createSupabaseServiceClient();
  } catch {
    return await createSupabaseServerClient();
  }
}

type WallPostRow = {
  id: string;
  author_name: string;
  author_email: string | null;
  body: string;
  status: WallStatus;
  video_id: string | null;
  parent_id: string | null;
  likes_count: number | null;
  reports_count: number | null;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  approved_by: string | null;
  ip_hash: string | null;
  user_agent_hash: string | null;
};

type WallModerationLogRow = {
  id: string;
  post_id: string;
  action: string;
  reason: string | null;
  moderator: string | null;
  created_at: string;
};

type AdminWallPost = WallPost & {
  author_email: string | null;
  moderation_log: WallModerationLogRow[];
};

type ListPublicWallParams = {
  videoId?: string | null;
  limit?: number;
  offset?: number;
  sort?: WallSort;
};

type ListAdminWallParams = {
  status?: WallStatus;
  limit?: number;
  offset?: number;
};

type AddReactionResult = {
  ok: boolean;
  duplicate: boolean;
  likesCount: number;
};

type ReportPostResult = {
  ok: boolean;
  duplicate: boolean;
  reportsCount: number;
  status: WallStatus;
};

export class WallServiceError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 30;
const DEFAULT_ADMIN_LIMIT = 80;
const REACTION_TYPE = "like";
const WALL_SCHEMA_MISSING_MESSAGE =
  "Zeď není v databázi inicializována. Spusťte migraci `db/wall_community.sql` v Supabase.";

type DbErrorLike = {
  message?: string;
  code?: string;
} | null | undefined;

function isWallSchemaMissingError(error: DbErrorLike): boolean {
  if (!error) return false;
  if (error.code === "42P01") return true;
  const message = (error.message ?? "").toLowerCase();
  if (!message) return false;
  return (
    (message.includes("wall_posts") || message.includes("wall_reactions") || message.includes("wall_reports")) &&
    (message.includes("schema cache") || message.includes("does not exist") || message.includes("could not find table"))
  );
}

function isRlsPolicyError(error: DbErrorLike): boolean {
  if (!error) return false;
  const message = (error.message ?? "").toLowerCase();
  return message.includes("row-level security policy");
}

function toDbServiceError(actionLabel: string, error: DbErrorLike): WallServiceError {
  if (isWallSchemaMissingError(error)) {
    return new WallServiceError(503, WALL_SCHEMA_MISSING_MESSAGE);
  }
  if (isRlsPolicyError(error)) {
    return new WallServiceError(
      503,
      "Zeď je blokována Supabase RLS politikou. Spusťte SQL: `alter table wall_posts disable row level security; alter table wall_reactions disable row level security; alter table wall_reports disable row level security; alter table wall_moderation_log disable row level security;`"
    );
  }
  const message = error?.message?.trim();
  return new WallServiceError(500, `${actionLabel}${message ? `: ${message}` : ""}`);
}

function normalizeLimit(value: number | undefined, defaultValue: number): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return defaultValue;
  return Math.max(1, Math.min(MAX_LIMIT, Math.floor(numeric)));
}

function normalizeOffset(value: number | undefined): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.floor(numeric));
}

function normalizeSort(value: string | undefined): WallSort {
  return value === "popular" ? "popular" : "newest";
}

function normalizeStatus(value: string | undefined): WallStatus | null {
  if (!value) return null;
  if (value === "pending" || value === "approved" || value === "rejected" || value === "hidden" || value === "flagged") {
    return value;
  }
  return null;
}

function normalizeVideoId(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeEmail(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function mapToPublicPost(row: WallPostRow, videoTitleById: Map<string, string>): WallPost {
  const videoId = row.video_id ?? null;
  return {
    id: row.id,
    author_name: row.author_name,
    body: row.body,
    status: row.status,
    video_id: videoId,
    video_title: videoId ? videoTitleById.get(videoId) ?? null : null,
    parent_id: row.parent_id ?? null,
    likes_count: row.likes_count ?? 0,
    reports_count: row.reports_count ?? 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
    approved_at: row.approved_at ?? null,
    approved_by: row.approved_by ?? null,
  };
}

async function loadVideoTitleMap(videoIds: string[]): Promise<Map<string, string>> {
  if (videoIds.length === 0) return new Map<string, string>();
  const supabase = await getWallClient();
  const { data, error } = await supabase
    .from("videos")
    .select("video_id, title")
    .in("video_id", videoIds);

  if (error || !data) return new Map<string, string>();
  const map = new Map<string, string>();
  for (const row of data as Array<{ video_id: string; title: string | null }>) {
    if (row.video_id && row.title) map.set(row.video_id, row.title);
  }
  return map;
}

async function addModerationLog(params: {
  postId: string;
  action: string;
  reason?: string | null;
  moderator?: string | null;
}) {
  const supabase = await getWallClient();
  await supabase.from("wall_moderation_log").insert({
    post_id: params.postId,
    action: params.action,
    reason: params.reason ?? null,
    moderator: params.moderator ?? null,
  });
}

async function enforceCreateRateLimit(meta: WallIdentityMeta) {
  const supabase = await getWallClient();
  const sinceIso = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  if (meta.ipHash) {
    const byIp = await supabase
      .from("wall_posts")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", meta.ipHash)
      .gte("created_at", sinceIso);
    if ((byIp.count ?? 0) >= 5) {
      throw new WallServiceError(429, "Příliš mnoho příspěvků z jedné IP. Zkuste to prosím později.");
    }
  }

  const sessionMarker = meta.userAgentHash ?? meta.sessionHash;
  const bySession = await supabase
    .from("wall_posts")
    .select("id", { count: "exact", head: true })
    .eq("user_agent_hash", sessionMarker)
    .gte("created_at", sinceIso);
  if ((bySession.count ?? 0) >= 8) {
    throw new WallServiceError(429, "Příliš mnoho příspěvků z jedné relace. Zkuste to prosím později.");
  }
}

export async function listPublicWallPosts(params: ListPublicWallParams = {}): Promise<WallPostListResult> {
  const supabase = await getWallClient();
  const limit = normalizeLimit(params.limit, DEFAULT_LIMIT);
  const offset = normalizeOffset(params.offset);
  const sort = normalizeSort(params.sort);
  const videoId = normalizeVideoId(params.videoId);

  let query = supabase
    .from("wall_posts")
    .select(
      "id, author_name, author_email, body, status, video_id, parent_id, likes_count, reports_count, created_at, updated_at, approved_at, approved_by, ip_hash, user_agent_hash",
      { count: "exact" }
    )
    .eq("status", "approved");

  if (videoId) {
    query = query.eq("video_id", videoId);
  }

  query = sort === "popular"
    ? query.order("likes_count", { ascending: false }).order("created_at", { ascending: false })
    : query.order("created_at", { ascending: false });

  const { data, error, count } = await query.range(offset, offset + limit - 1);
  if (error) {
    throw toDbServiceError("Načtení příspěvků selhalo", error);
  }

  const rows = (data ?? []) as WallPostRow[];
  const videoIds = Array.from(
    new Set(rows.map((row) => row.video_id).filter((value): value is string => Boolean(value)))
  );
  const videoTitleById = await loadVideoTitleMap(videoIds);
  const posts = rows.map((row) => mapToPublicPost(row, videoTitleById));
  const total = count ?? posts.length;

  return {
    posts,
    limit,
    offset,
    sort,
    hasMore: offset + posts.length < total,
  };
}

export async function createWallPost(
  input: CreateWallPostInput,
  identity: WallIdentityMeta
): Promise<WallPostCreateResult> {
  const authorName = sanitizeWallText(input.authorName ?? "");
  const body = sanitizeWallText(input.body ?? "");
  const parentId = normalizeVideoId(input.parentId ?? null);
  let videoId = normalizeVideoId(input.videoId ?? null);
  const authorEmail = normalizeEmail(input.authorEmail ?? null);

  if (authorName.length < 2 || authorName.length > 60) {
    throw new WallServiceError(400, "Přezdívka musí mít 2 až 60 znaků.");
  }
  if (body.length < 3 || body.length > 1500) {
    throw new WallServiceError(400, "Text vzkazu musí mít 3 až 1500 znaků.");
  }
  if (authorEmail && !isValidEmail(authorEmail)) {
    throw new WallServiceError(400, "E-mail nemá validní formát.");
  }

  const supabase = await getWallClient();
  let parentRow: WallPostRow | null = null;
  if (parentId) {
    const parentLookup = await supabase
      .from("wall_posts")
      .select(
        "id, author_name, author_email, body, status, video_id, parent_id, likes_count, reports_count, created_at, updated_at, approved_at, approved_by, ip_hash, user_agent_hash"
      )
      .eq("id", parentId)
      .maybeSingle();
    if (parentLookup.error || !parentLookup.data) {
      throw new WallServiceError(400, "Nadřazený příspěvek nebyl nalezen.");
    }
    parentRow = parentLookup.data as WallPostRow;
    if (parentRow.parent_id) {
      throw new WallServiceError(400, "Odpověď lze vytvořit pouze na hlavní příspěvek.");
    }
    if (videoId && parentRow.video_id && videoId !== parentRow.video_id) {
      throw new WallServiceError(400, "Odpověď musí mít stejné video_id jako rodič.");
    }
    if (!videoId && parentRow.video_id) {
      videoId = parentRow.video_id;
    }
  }

  await enforceCreateRateLimit(identity);
  const moderation = moderateWallPost({
    authorName,
    authorEmail,
    body,
    videoId,
    parentId,
  });
  const approvedAt = moderation.status === "approved" ? new Date().toISOString() : null;
  const approvedBy = moderation.status === "approved" ? "auto-moderation" : null;

  const { data, error } = await supabase
    .from("wall_posts")
    .insert({
      author_name: authorName,
      author_email: authorEmail,
      body,
      status: moderation.status,
      video_id: videoId,
      parent_id: parentId,
      ip_hash: identity.ipHash,
      user_agent_hash: identity.userAgentHash ?? identity.sessionHash,
      approved_at: approvedAt,
      approved_by: approvedBy,
    })
    .select(
      "id, author_name, author_email, body, status, video_id, parent_id, likes_count, reports_count, created_at, updated_at, approved_at, approved_by, ip_hash, user_agent_hash"
    )
    .single();

  if (error || !data) {
    throw toDbServiceError("Uložení příspěvku selhalo", error);
  }

  const inserted = data as WallPostRow;
  if (moderation.status === "flagged" || moderation.status === "rejected") {
    await addModerationLog({
      postId: inserted.id,
      action: moderation.status === "flagged" ? "auto-flag" : "auto-reject",
      reason: moderation.reasons.join(", "),
      moderator: "auto-moderation",
    });
  }

  const videoTitleById =
    inserted.video_id !== null ? await loadVideoTitleMap([inserted.video_id]) : new Map<string, string>();
  return {
    post: mapToPublicPost(inserted, videoTitleById),
    status: moderation.status,
    moderationReasons: moderation.reasons,
  };
}

async function requirePublicPost(postId: string): Promise<WallPostRow> {
  const supabase = await getWallClient();
  const { data, error } = await supabase
    .from("wall_posts")
    .select(
      "id, author_name, author_email, body, status, video_id, parent_id, likes_count, reports_count, created_at, updated_at, approved_at, approved_by, ip_hash, user_agent_hash"
    )
    .eq("id", postId)
    .maybeSingle();
  if (error) {
    throw toDbServiceError("Načtení příspěvku selhalo", error);
  }
  if (!data) {
    throw new WallServiceError(404, "Příspěvek nebyl nalezen.");
  }
  return data as WallPostRow;
}

export async function addWallReaction(postId: string, sessionHash: string): Promise<AddReactionResult> {
  const supabase = await getWallClient();
  const post = await requirePublicPost(postId);
  if (post.status !== "approved") {
    throw new WallServiceError(403, "Na tento příspěvek nelze reagovat.");
  }

  const insert = await supabase.from("wall_reactions").insert({
    post_id: postId,
    reaction_type: REACTION_TYPE,
    session_hash: sessionHash,
  });

  if (insert.error) {
    if (insert.error.code === "23505") {
      return {
        ok: true,
        duplicate: true,
        likesCount: post.likes_count ?? 0,
      };
    }
    throw toDbServiceError("Uložení reakce selhalo", insert.error);
  }

  const reactionCount = await supabase
    .from("wall_reactions")
    .select("id", { count: "exact", head: true })
    .eq("post_id", postId)
    .eq("reaction_type", REACTION_TYPE);
  const likesCount = reactionCount.count ?? post.likes_count ?? 0;
  await supabase.from("wall_posts").update({ likes_count: likesCount }).eq("id", postId);

  return {
    ok: true,
    duplicate: false,
    likesCount,
  };
}

export async function reportWallPost(
  postId: string,
  sessionHash: string,
  reason?: string | null
): Promise<ReportPostResult> {
  const supabase = await getWallClient();
  const post = await requirePublicPost(postId);
  const normalizedReason = reason ? sanitizeWallText(reason).slice(0, 500) : null;

  const duplicateLookup = await supabase
    .from("wall_reports")
    .select("id")
    .eq("post_id", postId)
    .eq("session_hash", sessionHash)
    .limit(1);
  const alreadyReported = (duplicateLookup.data?.length ?? 0) > 0;
  if (!alreadyReported) {
    const insert = await supabase.from("wall_reports").insert({
      post_id: postId,
      reason: normalizedReason,
      session_hash: sessionHash,
    });
    if (insert.error) {
      throw toDbServiceError("Nahlášení příspěvku selhalo", insert.error);
    }
  }

  const reportCountResult = await supabase
    .from("wall_reports")
    .select("id", { count: "exact", head: true })
    .eq("post_id", postId);
  const reportsCount = reportCountResult.count ?? post.reports_count ?? 0;
  let targetStatus: WallStatus = post.status;
  if (reportsCount >= 3 && (post.status === "approved" || post.status === "pending")) {
    targetStatus = "flagged";
  }

  const updatePayload: {
    reports_count: number;
    status?: WallStatus;
  } = {
    reports_count: reportsCount,
  };
  if (targetStatus !== post.status) {
    updatePayload.status = targetStatus;
  }
  await supabase.from("wall_posts").update(updatePayload).eq("id", postId);

  if (targetStatus === "flagged" && post.status !== "flagged") {
    await addModerationLog({
      postId,
      action: "auto-flag-threshold",
      reason: `reports_count=${reportsCount}`,
      moderator: "auto-moderation",
    });
  }

  return {
    ok: true,
    duplicate: alreadyReported,
    reportsCount,
    status: targetStatus,
  };
}

async function getModerationLogsByPostIds(postIds: string[]): Promise<Map<string, WallModerationLogRow[]>> {
  if (postIds.length === 0) return new Map<string, WallModerationLogRow[]>();
  const supabase = await getWallClient();
  const { data } = await supabase
    .from("wall_moderation_log")
    .select("id, post_id, action, reason, moderator, created_at")
    .in("post_id", postIds)
    .order("created_at", { ascending: false });
  const grouped = new Map<string, WallModerationLogRow[]>();
  for (const row of (data ?? []) as WallModerationLogRow[]) {
    if (!grouped.has(row.post_id)) grouped.set(row.post_id, []);
    grouped.get(row.post_id)?.push(row);
  }
  return grouped;
}

export async function listAdminWallPosts(params: ListAdminWallParams = {}): Promise<{
  posts: AdminWallPost[];
  limit: number;
  offset: number;
  hasMore: boolean;
}> {
  const supabase = await getWallClient();
  const status = params.status ?? null;
  const limit = normalizeLimit(params.limit, DEFAULT_ADMIN_LIMIT);
  const offset = normalizeOffset(params.offset);

  let query = supabase
    .from("wall_posts")
    .select(
      "id, author_name, author_email, body, status, video_id, parent_id, likes_count, reports_count, created_at, updated_at, approved_at, approved_by, ip_hash, user_agent_hash",
      { count: "exact" }
    )
    .order("created_at", { ascending: false });
  if (status) {
    query = query.eq("status", status);
  }

  const { data, error, count } = await query.range(offset, offset + limit - 1);
  if (error) {
    throw toDbServiceError("Admin výpis selhal", error);
  }
  const rows = (data ?? []) as WallPostRow[];
  const videoIds = Array.from(
    new Set(rows.map((row) => row.video_id).filter((value): value is string => Boolean(value)))
  );
  const videoTitleById = await loadVideoTitleMap(videoIds);
  const logsByPostId = await getModerationLogsByPostIds(rows.map((row) => row.id));

  const posts: AdminWallPost[] = rows.map((row) => ({
    ...mapToPublicPost(row, videoTitleById),
    author_email: row.author_email ?? null,
    moderation_log: logsByPostId.get(row.id) ?? [],
  }));

  const total = count ?? posts.length;
  return {
    posts,
    limit,
    offset,
    hasMore: offset + posts.length < total,
  };
}

export function parseWallStatus(value: string | undefined): WallStatus | null {
  return normalizeStatus(value);
}

export function parseWallSort(value: string | undefined): WallSort {
  return normalizeSort(value);
}

export async function updateWallPostStatusByAdmin(params: {
  postId: string;
  status: WallStatus;
  moderator: string;
  reason?: string | null;
}): Promise<AdminWallPost> {
  const supabase = await getWallClient();
  const existing = await requirePublicPost(params.postId);
  const nowIso = new Date().toISOString();
  const reason = params.reason ? sanitizeWallText(params.reason).slice(0, 500) : null;

  const updatePayload: {
    status: WallStatus;
    approved_at: string | null;
    approved_by: string | null;
    updated_at?: string;
  } = {
    status: params.status,
    approved_at: params.status === "approved" ? nowIso : null,
    approved_by: params.status === "approved" ? params.moderator : null,
    updated_at: nowIso,
  };

  const { data, error } = await supabase
    .from("wall_posts")
    .update(updatePayload)
    .eq("id", existing.id)
    .select(
      "id, author_name, author_email, body, status, video_id, parent_id, likes_count, reports_count, created_at, updated_at, approved_at, approved_by, ip_hash, user_agent_hash"
    )
    .single();

  if (error || !data) {
    throw toDbServiceError("Změna statusu selhala", error);
  }

  await addModerationLog({
    postId: existing.id,
    action: params.status,
    reason,
    moderator: params.moderator,
  });

  const row = data as WallPostRow;
  const titleMap = row.video_id ? await loadVideoTitleMap([row.video_id]) : new Map<string, string>();
  const logs = await getModerationLogsByPostIds([row.id]);
  return {
    ...mapToPublicPost(row, titleMap),
    author_email: row.author_email ?? null,
    moderation_log: logs.get(row.id) ?? [],
  };
}


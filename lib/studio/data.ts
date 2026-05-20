import "server-only";

import { getNowPlaying, getProgram } from "@/lib/programEngine";
import { getProgramHealth } from "@/lib/programHealth";
import { STUDIO_ALLOWED_EMAILS, type StudioAccessContext } from "@/lib/studio/access";

type WarningBag = {
  items: string[];
};

type SimpleStatus = "ok" | "warning" | "error";

export type StudioKpiCard = {
  id: string;
  label: string;
  value: string;
  hint?: string;
  tone?: SimpleStatus;
};

export type StudioNewsRow = {
  id: string;
  title: string;
  status: string;
  edition: string;
  category: string | null;
  publishedAt: string | null;
  generatedAt: string | null;
  autoPublished: boolean;
  priority: number;
};

export type StudioBreakingRow = {
  id: string;
  title: string;
  status: string;
  priority: number;
  validFrom: string | null;
  validTo: string | null;
  publishedAt: string | null;
  withdrawnAt: string | null;
};

export type StudioProgramRow = {
  id: string;
  title: string;
  type: string;
  status: string;
  startsAt: string | null;
  endsAt: string | null;
  action: string | null;
};

export type StudioVideoRow = {
  videoId: string;
  title: string;
  channel: string;
  publishedAt: string | null;
  durationMin: number | null;
  suitableForBroadcast: boolean;
  starts: number;
  completions: number;
  progressEvents: number;
};

export type StudioChannelRow = {
  channelId: string;
  channelName: string;
  videosCount: number;
  followersCount: number;
  starts7d: number;
  starts30d: number;
};

export type StudioCommentRow = {
  id: string;
  body: string;
  status: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  userId: string;
};

export type StudioViewerDetail = {
  id: string;
  email: string | null;
  displayName: string | null;
  provider: string | null;
  role: string | null;
  createdAt: string;
  lastSeenAt: string | null;
  commentsCount: number;
  reportsCount: number;
};

export type StudioAuditRow = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  reason: string | null;
  actorId: string | null;
  createdAt: string;
};

export type StudioSnapshot = {
  nowIso: string;
  overviewCards: StudioKpiCard[];
  automation: {
    status: SimpleStatus;
    healthChecks: Array<{ id: string; status: string; message: string }>;
    lastRuns: Array<{ id: string; status: string; startedAt: string; finishedAt: string | null; errorText: string | null }>;
    queue: Array<{ id: string; kind: string; status: string; createdAt: string }>;
    nextEditionHint: string;
    nextProgramRebuildHint: string;
  };
  news: {
    rows: StudioNewsRow[];
  };
  breakingNews: {
    activeCount: number;
    rows: StudioBreakingRow[];
  };
  program: {
    nowPlaying: {
      title: string | null;
      type: string | null;
      channel: string | null;
      endsAt: string | null;
    };
    overrides: StudioProgramRow[];
  };
  videos: {
    rows: StudioVideoRow[];
  };
  channels: {
    rows: StudioChannelRow[];
  };
  comments: {
    lastHourCount: number;
    flaggedCount: number;
    hiddenCount: number;
    potentialSpamUsers: number;
    latest: StudioCommentRow[];
  };
  viewers: {
    registeredTotal: number;
    newToday: number;
    activeToday: number;
    active7d: number;
    active30d: number;
    providerBreakdown: Record<string, number>;
    commentingUsers: number;
    likingUsers: number;
    resumeUsers: number;
    topUsers: StudioViewerDetail[];
  };
  statistics: {
    events24h: Record<string, number>;
    topVideosToday: Array<{ entityId: string; count: number }>;
    topChannelsToday: Array<{ entityId: string; count: number }>;
  };
  settings: {
    internalUsers: Array<{ userId: string; email: string | null; displayName: string | null; profileRole: string | null; extraRoles: string[] }>;
    allowedEmails: string[];
    restrictedToAllowlist: boolean;
  };
  audit: {
    rows: StudioAuditRow[];
  };
  warnings: string[];
};

type GenericError = { message: string } | null;

function toIso(date: Date): string {
  return date.toISOString();
}

function isMissingSchema(error: GenericError): boolean {
  if (!error?.message) return false;
  return /relation .* does not exist|column .* does not exist/i.test(error.message);
}

function isDenied(error: GenericError): boolean {
  if (!error?.message) return false;
  return /permission denied|row-level security|not authorized/i.test(error.message);
}

function warnOnError(bag: WarningBag, source: string, error: GenericError) {
  if (!error) return;
  if (isMissingSchema(error) || isDenied(error)) {
    bag.items.push(`${source}: ${error.message}`);
    return;
  }
  bag.items.push(`${source}: ${error.message}`);
}

function formatCardNumber(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("cs-CZ").format(value);
}

function aggregateByEntity(
  rows: Array<{ entity_id: string | null; event_name: string }>,
  acceptedEvents: string[],
): Map<string, number> {
  const accepted = new Set(acceptedEvents);
  const map = new Map<string, number>();
  for (const row of rows) {
    if (!row.entity_id) continue;
    if (!accepted.has(row.event_name)) continue;
    map.set(row.entity_id, (map.get(row.entity_id) ?? 0) + 1);
  }
  return map;
}

function topEntries(map: Map<string, number>, limit: number): Array<{ entityId: string; count: number }> {
  return Array.from(map.entries())
    .map(([entityId, count]) => ({ entityId, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function getFutureLabel(minutesAhead: number): string {
  if (minutesAhead <= 0) return "právě teď";
  if (minutesAhead < 60) return `za ${minutesAhead} min`;
  const hours = Math.floor(minutesAhead / 60);
  const rest = minutesAhead % 60;
  if (rest === 0) return `za ${hours} h`;
  return `za ${hours} h ${rest} min`;
}

function nextEditionHint(now: Date): string {
  const slots = [7, 12, 18];
  const prague = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Prague",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const map = new Map(prague.map((part) => [part.type, part.value]));
  const currentHour = Number(map.get("hour") ?? 0);
  const currentMinute = Number(map.get("minute") ?? 0);
  const total = currentHour * 60 + currentMinute;
  for (const hour of slots) {
    const slotMinutes = hour * 60;
    if (slotMinutes > total) {
      return getFutureLabel(slotMinutes - total);
    }
  }
  return "zítra ráno";
}

function toSimpleStatus(value: string | undefined): SimpleStatus {
  if (value === "error" || value === "failed") return "error";
  if (value === "warning" || value === "running") return "warning";
  return "ok";
}

export async function loadStudioSnapshot(context: StudioAccessContext): Promise<StudioSnapshot> {
  const warnings: WarningBag = { items: [] };
  const supabase = context.supabase;

  const now = new Date();
  const hourAgoIso = toIso(new Date(now.getTime() - 60 * 60 * 1000));
  const dayAgoIso = toIso(new Date(now.getTime() - 24 * 60 * 60 * 1000));
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const dayStartIso = toIso(dayStart);
  const weekAgoIso = toIso(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
  const monthAgoIso = toIso(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));
  const onlineWindowIso = toIso(new Date(now.getTime() - 5 * 60 * 1000));

  const [
    programHealth,
    nowPlaying,
    timeline,
    profilesTotalRes,
    profilesNewTodayRes,
    profilesActiveTodayRes,
    profilesActive7Res,
    profilesActive30Res,
    providerRowsRes,
    recentIngestRes,
    queueOverridesRes,
    newsRowsRes,
    newsEditionRes,
    breakingRowsRes,
    commentsLastHourRes,
    commentsFlaggedRes,
    commentsHiddenRes,
    latestCommentsRes,
    analyticsTodayRes,
    analytics24hRes,
    videosListRes,
    sourcesRes,
    followsRes,
    topAuditRes,
    adminRolesRes,
    viewerActivityDistinctRes,
    likesDistinctRes,
    resumeUsersRes,
  ] = await Promise.all([
    getProgramHealth().catch(() => null),
    getNowPlaying().catch(() => null),
    getProgram().catch(() => []),
    supabase.from("profiles").select("id", { head: true, count: "exact" }),
    supabase.from("profiles").select("id", { head: true, count: "exact" }).gte("created_at", dayStartIso),
    supabase.from("profiles").select("id", { head: true, count: "exact" }).gte("last_seen_at", dayStartIso),
    supabase.from("profiles").select("id", { head: true, count: "exact" }).gte("last_seen_at", weekAgoIso),
    supabase.from("profiles").select("id", { head: true, count: "exact" }).gte("last_seen_at", monthAgoIso),
    supabase.from("profiles").select("provider").limit(2000),
    supabase
      .from("ingest_runs")
      .select("id, status, started_at, finished_at, error_text")
      .order("started_at", { ascending: false })
      .limit(8),
    supabase
      .from("broadcast_schedule_overrides")
      .select("id, action, status, starts_at, ends_at, title")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("editorial_items")
      .select("id, title, status, type, metadata, priority, auto_published, published_at, created_at")
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(40),
    supabase
      .from("news_editions")
      .select("id, title, edition_type, status, published_at, generated_at")
      .eq("status", "published")
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("breaking_news")
      .select("id, title, status, priority, valid_from, valid_to, published_at, withdrawn_at")
      .order("created_at", { ascending: false })
      .limit(30),
    supabase.from("comments").select("id", { head: true, count: "exact" }).gte("created_at", hourAgoIso),
    supabase.from("comments").select("id", { head: true, count: "exact" }).in("status", ["flagged", "under_review", "pending"]),
    supabase.from("comments").select("id", { head: true, count: "exact" }).eq("status", "hidden"),
    supabase
      .from("comments")
      .select("id, body, status, entity_type, entity_id, created_at, user_id")
      .order("created_at", { ascending: false })
      .limit(40),
    supabase
      .from("analytics_events")
      .select("event_name, entity_id, created_at")
      .gte("created_at", dayStartIso)
      .limit(5000),
    supabase
      .from("analytics_events")
      .select("event_name, created_at")
      .gte("created_at", dayAgoIso)
      .limit(5000),
    supabase
      .from("videos")
      .select("video_id, title, channel_name, published_at, duration_min, metadata")
      .order("published_at", { ascending: false })
      .limit(20),
    supabase.from("sources").select("channel_id, source_name").eq("active", true).limit(400),
    supabase.from("follows").select("channel_id").limit(3000),
    supabase
      .from("audit_log")
      .select("id, action, entity_type, entity_id, reason, actor_id, created_at")
      .order("created_at", { ascending: false })
      .limit(80),
    supabase.from("admin_roles").select("user_id, role"),
    supabase.from("comments").select("user_id, created_at").gte("created_at", dayStartIso).limit(3000),
    supabase.from("likes").select("user_id").limit(3000),
    supabase.from("video_progress").select("user_id, completed").eq("completed", false).limit(3000),
  ]);

  warnOnError(warnings, "profiles total", profilesTotalRes.error);
  warnOnError(warnings, "profiles new today", profilesNewTodayRes.error);
  warnOnError(warnings, "profiles active today", profilesActiveTodayRes.error);
  warnOnError(warnings, "profiles active 7d", profilesActive7Res.error);
  warnOnError(warnings, "profiles active 30d", profilesActive30Res.error);
  warnOnError(warnings, "profiles provider breakdown", providerRowsRes.error);
  warnOnError(warnings, "ingest runs", recentIngestRes.error);
  warnOnError(warnings, "broadcast overrides", queueOverridesRes.error);
  warnOnError(warnings, "editorial items", newsRowsRes.error);
  warnOnError(warnings, "news editions", newsEditionRes.error);
  warnOnError(warnings, "breaking news", breakingRowsRes.error);
  warnOnError(warnings, "comments last hour", commentsLastHourRes.error);
  warnOnError(warnings, "comments flagged", commentsFlaggedRes.error);
  warnOnError(warnings, "comments hidden", commentsHiddenRes.error);
  warnOnError(warnings, "latest comments", latestCommentsRes.error);
  warnOnError(warnings, "analytics today", analyticsTodayRes.error);
  warnOnError(warnings, "analytics 24h", analytics24hRes.error);
  warnOnError(warnings, "videos list", videosListRes.error);
  warnOnError(warnings, "sources list", sourcesRes.error);
  warnOnError(warnings, "follows list", followsRes.error);
  warnOnError(warnings, "audit log", topAuditRes.error);
  warnOnError(warnings, "admin roles", adminRolesRes.error);
  warnOnError(warnings, "viewer activity distinct", viewerActivityDistinctRes.error);
  warnOnError(warnings, "likes distinct", likesDistinctRes.error);
  warnOnError(warnings, "resume users", resumeUsersRes.error);

  const onlineViewers = (profilesActiveTodayRes.data ?? []).length
    ? ((await supabase.from("profiles").select("id", { head: true, count: "exact" }).gte("last_seen_at", onlineWindowIso)).count ?? 0)
    : 0;

  const analyticsTodayRows = (analyticsTodayRes.data ?? []) as Array<{ event_name: string; entity_id: string | null; created_at: string }>;
  const analytics24hRows = (analytics24hRes.data ?? []) as Array<{ event_name: string; created_at: string }>;
  const topVideosToday = topEntries(aggregateByEntity(analyticsTodayRows, ["video_start", "video_complete"]), 10);
  const topChannelsToday = topEntries(aggregateByEntity(analyticsTodayRows, ["channel_open", "follow_channel"]), 10);

  const videosRowsRaw = (videosListRes.data ?? []) as Array<{
    video_id: string;
    title: string;
    channel_name: string | null;
    published_at: string | null;
    duration_min: number | null;
    metadata: Record<string, unknown> | null;
  }>;

  const videoStartsById = aggregateByEntity(analyticsTodayRows, ["video_start"]);
  const videoCompletionsById = aggregateByEntity(analyticsTodayRows, ["video_complete"]);
  const videoProgressById = aggregateByEntity(analyticsTodayRows, ["video_progress"]);
  const videos = videosRowsRaw.map((row) => {
    const suitable = row.metadata?.broadcast_banned === true ? false : true;
    return {
      videoId: row.video_id,
      title: row.title,
      channel: row.channel_name ?? "Neznámý kanál",
      publishedAt: row.published_at,
      durationMin: row.duration_min,
      suitableForBroadcast: suitable,
      starts: videoStartsById.get(row.video_id) ?? 0,
      completions: videoCompletionsById.get(row.video_id) ?? 0,
      progressEvents: videoProgressById.get(row.video_id) ?? 0,
    } satisfies StudioVideoRow;
  });

  const followsRows = (followsRes.data ?? []) as Array<{ channel_id: string }>;
  const followsCountByChannel = new Map<string, number>();
  for (const row of followsRows) {
    followsCountByChannel.set(row.channel_id, (followsCountByChannel.get(row.channel_id) ?? 0) + 1);
  }

  const sourcesRows = (sourcesRes.data ?? []) as Array<{ channel_id: string | null; source_name: string | null }>;
  const videosByChannel = new Map<string, number>();
  for (const video of videos) {
    videosByChannel.set(video.channel, (videosByChannel.get(video.channel) ?? 0) + 1);
  }
  const starts7dRows = (analyticsTodayRows ?? []).filter((row) => row.event_name === "video_start");
  const starts30Rows = starts7dRows;
  const channels: StudioChannelRow[] = sourcesRows
    .filter((row) => row.channel_id)
    .slice(0, 20)
    .map((row) => ({
      channelId: row.channel_id ?? "—",
      channelName: row.source_name ?? row.channel_id ?? "Neznámý kanál",
      videosCount: videosByChannel.get(row.source_name ?? "") ?? 0,
      followersCount: followsCountByChannel.get(row.channel_id ?? "") ?? 0,
      starts7d: starts7dRows.filter((entry) => entry.entity_id === row.channel_id).length,
      starts30d: starts30Rows.filter((entry) => entry.entity_id === row.channel_id).length,
    }))
    .sort((a, b) => b.starts7d - a.starts7d);

  const commentsRows = (latestCommentsRes.data ?? []) as Array<{
    id: string;
    body: string;
    status: string;
    entity_type: string;
    entity_id: string;
    created_at: string;
    user_id: string;
  }>;
  const potentialSpamUsers = new Set(
    commentsRows
      .filter((row) => new Date(row.created_at).getTime() >= new Date(hourAgoIso).getTime())
      .map((row) => row.user_id),
  );

  const providerBreakdown: Record<string, number> = {};
  for (const row of (providerRowsRes.data ?? []) as Array<{ provider: string | null }>) {
    const key = row.provider?.trim() || "unknown";
    providerBreakdown[key] = (providerBreakdown[key] ?? 0) + 1;
  }

  const commentingUsers = new Set(
    ((viewerActivityDistinctRes.data ?? []) as Array<{ user_id: string | null }>)
      .map((row) => row.user_id)
      .filter((value): value is string => typeof value === "string"),
  );
  const likingUsers = new Set(
    ((likesDistinctRes.data ?? []) as Array<{ user_id: string | null }>)
      .map((row) => row.user_id)
      .filter((value): value is string => typeof value === "string"),
  );
  const resumeUsers = new Set(
    ((resumeUsersRes.data ?? []) as Array<{ user_id: string | null }>)
      .map((row) => row.user_id)
      .filter((value): value is string => typeof value === "string"),
  );

  const adminRolesRows = (adminRolesRes.data ?? []) as Array<{ user_id: string; role: string }>;
  const adminRolesByUser = new Map<string, string[]>();
  for (const row of adminRolesRows) {
    const list = adminRolesByUser.get(row.user_id) ?? [];
    list.push(row.role);
    adminRolesByUser.set(row.user_id, list);
  }

  const roleUserIds = Array.from(adminRolesByUser.keys());
  let profileRows: Array<{ id: string; email: string | null; display_name: string | null; role: string | null; created_at: string; last_seen_at: string | null }> = [];
  if (roleUserIds.length > 0) {
    const profilesByRoleRes = await supabase
      .from("profiles")
      .select("id, email, display_name, role, created_at, last_seen_at")
      .in("id", roleUserIds)
      .limit(400);
    warnOnError(warnings, "profiles by role", profilesByRoleRes.error);
    profileRows = (profilesByRoleRes.data ?? []) as Array<{
      id: string;
      email: string | null;
      display_name: string | null;
      role: string | null;
      created_at: string;
      last_seen_at: string | null;
    }>;
  }

  const commentsByUser = new Map<string, number>();
  for (const row of commentsRows) {
    commentsByUser.set(row.user_id, (commentsByUser.get(row.user_id) ?? 0) + 1);
  }

  const topUsers: StudioViewerDetail[] = profileRows.slice(0, 20).map((row) => ({
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    provider: null,
    role: row.role,
    createdAt: row.created_at,
    lastSeenAt: row.last_seen_at,
    commentsCount: commentsByUser.get(row.id) ?? 0,
    reportsCount: 0,
  }));

  const newsRowsRaw = (newsRowsRes.data ?? []) as Array<{
    id: string;
    title: string;
    status: string;
    type: string;
    metadata: Record<string, unknown> | null;
    priority: number | null;
    auto_published: boolean | null;
    published_at: string | null;
    created_at: string | null;
  }>;
  const news: StudioNewsRow[] = newsRowsRaw.map((row) => ({
    id: row.id,
    title: row.title,
    status: row.status,
    edition: row.type ?? "manual",
    category: typeof row.metadata?.category === "string" ? row.metadata.category : null,
    publishedAt: row.published_at,
    generatedAt: row.created_at,
    autoPublished: row.auto_published === true,
    priority: row.priority ?? 0,
  }));

  const breakingRowsRaw = (breakingRowsRes.data ?? []) as Array<{
    id: string;
    title: string;
    status: string;
    priority: number | null;
    valid_from: string | null;
    valid_to: string | null;
    published_at: string | null;
    withdrawn_at: string | null;
  }>;
  const breakingRows: StudioBreakingRow[] = breakingRowsRaw.map((row) => ({
    id: row.id,
    title: row.title,
    status: row.status,
    priority: row.priority ?? 0,
    validFrom: row.valid_from,
    validTo: row.valid_to,
    publishedAt: row.published_at,
    withdrawnAt: row.withdrawn_at,
  }));

  const activeBreakingCount = breakingRows.filter((row) => row.status === "published").length;

  const recentRuns = ((recentIngestRes.data ?? []) as Array<{
    id: string;
    status: string;
    started_at: string;
    finished_at: string | null;
    error_text: string | null;
  }>).map((row) => ({
    id: row.id,
    status: row.status,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    errorText: row.error_text,
  }));

  const queueRows = ((queueOverridesRes.data ?? []) as Array<{
    id: string;
    action: string | null;
    status: string | null;
    starts_at: string | null;
    title: string | null;
  }>).map((row) => ({
    id: row.id,
    kind: row.action ?? "override",
    status: row.status ?? "active",
    createdAt: row.starts_at ?? "",
  }));

  const overviewCards: StudioKpiCard[] = [
    { id: "online", label: "Aktuální diváci online", value: formatCardNumber(onlineViewers), tone: "ok" },
    { id: "active-today", label: "Přihlášení diváci dnes", value: formatCardNumber(profilesActiveTodayRes.count ?? 0), tone: "ok" },
    { id: "new-today", label: "Noví registrovaní dnes", value: formatCardNumber(profilesNewTodayRes.count ?? 0), tone: "ok" },
    {
      id: "top-video",
      label: "Nejsledovanější video dne",
      value: topVideosToday[0]?.entityId ?? "Žádná data",
      hint: topVideosToday[0] ? `${topVideosToday[0].count} interakcí` : "Čeká na eventy",
    },
    {
      id: "top-channel",
      label: "Nejsilnější kanál dne",
      value: topChannelsToday[0]?.entityId ?? "Žádná data",
      hint: topChannelsToday[0] ? `${topChannelsToday[0].count} interakcí` : "Čeká na eventy",
    },
    {
      id: "edition",
      label: "Aktuální vydání Jasných zpráv",
      value: (newsEditionRes.data as { title?: string } | null)?.title ?? "Nedostupné",
      tone: newsEditionRes.data ? "ok" : "warning",
    },
    {
      id: "breaking-active",
      label: "Aktivní breaking news",
      value: formatCardNumber(activeBreakingCount),
      tone: activeBreakingCount > 0 ? "warning" : "ok",
    },
    {
      id: "comments-hour",
      label: "Komentáře za poslední hodinu",
      value: formatCardNumber(commentsLastHourRes.count ?? 0),
      tone: "ok",
    },
    {
      id: "reported-comments",
      label: "Nahlášené komentáře",
      value: formatCardNumber(commentsFlaggedRes.count ?? 0),
      tone: (commentsFlaggedRes.count ?? 0) > 0 ? "warning" : "ok",
    },
    {
      id: "automation-status",
      label: "Stav automatizace",
      value: programHealth?.overallStatus?.toUpperCase() ?? "NEZNÁMÝ",
      hint: programHealth?.checks?.find((check) => check.status !== "ok")?.message ?? "Bez alarmů",
      tone: toSimpleStatus(programHealth?.overallStatus),
    },
  ];

  const auditRows = ((topAuditRes.data ?? []) as Array<{
    id: string;
    action: string;
    entity_type: string;
    entity_id: string | null;
    reason: string | null;
    actor_id: string | null;
    created_at: string;
  }>).map((row) => ({
    id: row.id,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    reason: row.reason,
    actorId: row.actor_id,
    createdAt: row.created_at,
  }));

  const internalUsers = profileRows.map((row) => ({
    userId: row.id,
    email: row.email,
    displayName: row.display_name,
    profileRole: row.role,
    extraRoles: adminRolesByUser.get(row.id) ?? [],
  }));

  const events24h: Record<string, number> = {};
  for (const row of analytics24hRows) {
    events24h[row.event_name] = (events24h[row.event_name] ?? 0) + 1;
  }

  return {
    nowIso: now.toISOString(),
    overviewCards,
    automation: {
      status: toSimpleStatus(programHealth?.overallStatus),
      healthChecks:
        (programHealth?.checks ?? []).map((check) => ({
          id: check.id,
          status: check.status,
          message: check.message,
        })) ?? [],
      lastRuns: recentRuns,
      queue: queueRows,
      nextEditionHint: nextEditionHint(now),
      nextProgramRebuildHint: getFutureLabel(15),
    },
    news: {
      rows: news,
    },
    breakingNews: {
      activeCount: activeBreakingCount,
      rows: breakingRows,
    },
    program: {
      nowPlaying: {
        title: nowPlaying?.title ?? null,
        type: nowPlaying?.type ?? null,
        channel: nowPlaying?.channel ?? null,
        endsAt: nowPlaying?.end ?? null,
      },
      overrides: ((queueOverridesRes.data ?? []) as Array<{
        id: string;
        title: string | null;
        action: string | null;
        status: string | null;
        starts_at: string | null;
        ends_at: string | null;
      }>).map((row) => ({
        id: row.id,
        title: row.title ?? "Manuální zásah",
        type: "override",
        status: row.status ?? "active",
        startsAt: row.starts_at,
        endsAt: row.ends_at,
        action: row.action ?? null,
      })),
    },
    videos: {
      rows: videos,
    },
    channels: {
      rows: channels,
    },
    comments: {
      lastHourCount: commentsLastHourRes.count ?? 0,
      flaggedCount: commentsFlaggedRes.count ?? 0,
      hiddenCount: commentsHiddenRes.count ?? 0,
      potentialSpamUsers: potentialSpamUsers.size,
      latest: commentsRows.map((row) => ({
        id: row.id,
        body: row.body,
        status: row.status,
        entityType: row.entity_type,
        entityId: row.entity_id,
        createdAt: row.created_at,
        userId: row.user_id,
      })),
    },
    viewers: {
      registeredTotal: profilesTotalRes.count ?? 0,
      newToday: profilesNewTodayRes.count ?? 0,
      activeToday: profilesActiveTodayRes.count ?? 0,
      active7d: profilesActive7Res.count ?? 0,
      active30d: profilesActive30Res.count ?? 0,
      providerBreakdown,
      commentingUsers: commentingUsers.size,
      likingUsers: likingUsers.size,
      resumeUsers: resumeUsers.size,
      topUsers,
    },
    statistics: {
      events24h,
      topVideosToday,
      topChannelsToday,
    },
    settings: {
      internalUsers,
      allowedEmails: Array.from(STUDIO_ALLOWED_EMAILS).sort(),
      restrictedToAllowlist: true,
    },
    audit: {
      rows: auditRows,
    },
    warnings: warnings.items,
  };
}

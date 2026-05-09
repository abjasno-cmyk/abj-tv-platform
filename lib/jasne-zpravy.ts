import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const PRAGUE_TIME_ZONE = "Europe/Prague";
export const PUBLISHED_STATUS = "published";

export const EDITION_TYPE_LABEL: Record<string, string> = {
  morning: "Ranní",
  noon: "Polední",
  evening: "Večerní",
  manual: "Mimořádné",
};

export const EDITION_TYPE_FILTERS = ["morning", "noon", "evening", "manual"] as const;

export type EditionTypeFilter = (typeof EDITION_TYPE_FILTERS)[number];

export const CATEGORY_LABEL: Record<string, string> = {
  domestic: "Domácí",
  foreign: "Zahraničí",
  curiosity: "Kuriozita",
};

export const CATEGORY_ORDER = ["domestic", "foreign", "curiosity"] as const;

export type NewsEdition = {
  id: string;
  slug: string;
  edition_type: string;
  title: string;
  subtitle: string | null;
  summary: string | null;
  status?: string | null;
  published_at: string | null;
  generated_at: string | null;
};

export type NewsItem = {
  id: string;
  edition_id: string;
  category: string | null;
  rank: number | null;
  headline: string;
  short_headline: string | null;
  lead: string | null;
  body: string | null;
  why_it_matters: string | null;
  what_to_watch: string | null;
  source_count: number | null;
};

export type NewsSource = {
  id: string;
  news_item_id: string;
  source_title: string | null;
  source_name: string | null;
  source_url: string | null;
};

const EDITION_SELECT =
  "id, slug, edition_type, title, subtitle, summary, status, published_at, generated_at";
const ITEM_SELECT =
  "id, edition_id, category, rank, headline, short_headline, lead, body, why_it_matters, what_to_watch, source_count";
const SOURCE_SELECT = "id, news_item_id, source_title, source_name, source_url";

function sanitizeEnvValue(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  const equalsIdx = trimmed.indexOf("=");
  const withoutInlineKeyName =
    equalsIdx > 0 && /^[A-Z0-9_]+$/.test(trimmed.slice(0, equalsIdx))
      ? trimmed.slice(equalsIdx + 1).trim()
      : trimmed;

  if (
    (withoutInlineKeyName.startsWith('"') && withoutInlineKeyName.endsWith('"')) ||
    (withoutInlineKeyName.startsWith("'") && withoutInlineKeyName.endsWith("'"))
  ) {
    return withoutInlineKeyName.slice(1, -1).trim();
  }

  return withoutInlineKeyName;
}

export function createSupabaseNewsClient(): SupabaseClient {
  const supabaseUrl = sanitizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supabaseAnonKey = sanitizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase env vars not set");
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

function safeDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getEditionTimestamp(edition: Pick<NewsEdition, "published_at" | "generated_at">) {
  return edition.published_at ?? edition.generated_at;
}

function formatInPrague(
  value: string | Date | null | undefined,
  opts: Intl.DateTimeFormatOptions,
): string {
  const date = safeDate(value);
  if (!date) return "";

  try {
    return new Intl.DateTimeFormat("cs-CZ", {
      timeZone: PRAGUE_TIME_ZONE,
      ...opts,
    }).format(date);
  } catch {
    return "";
  }
}

export function formatPragueTime(value: string | Date | null | undefined): string {
  return formatInPrague(value, { hour: "2-digit", minute: "2-digit" });
}

export function formatPragueDate(value: string | Date | null | undefined): string {
  return formatInPrague(value, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatPragueDateWithWeekday(value: string | Date | null | undefined): string {
  return formatInPrague(value, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatPragueDateTime(value: string | Date | null | undefined): string {
  return formatInPrague(value, {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatPragueDateAndTimeCompact(value: string | Date | null | undefined): string {
  return formatInPrague(value, {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function toPragueDayKey(value: string | Date | null | undefined): string {
  const date = safeDate(value);
  if (!date) return "";

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: PRAGUE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function dayKeyToOrdinal(dayKey: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayKey);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

export function normalizeEditionTypeFilter(
  value: string | string[] | null | undefined,
): EditionTypeFilter | null {
  const first = Array.isArray(value) ? value[0] : value;
  if (!first) return null;
  return EDITION_TYPE_FILTERS.includes(first as EditionTypeFilter)
    ? (first as EditionTypeFilter)
    : null;
}

export function normalizeDateFilter(value: string | string[] | null | undefined): string | null {
  const first = Array.isArray(value) ? value[0] : value;
  if (!first || !/^\d{4}-\d{2}-\d{2}$/.test(first)) {
    return null;
  }

  const [year, month, day] = first.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return first;
}

function timeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const map = new Map(parts.map((part) => [part.type, part.value]));
  const year = Number(map.get("year"));
  const month = Number(map.get("month"));
  const day = Number(map.get("day"));
  const hour = Number(map.get("hour"));
  const minute = Number(map.get("minute"));
  const second = Number(map.get("second"));

  const asUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  return asUtc - date.getTime();
}

function zonedDateTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string,
): Date {
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  const offset = timeZoneOffsetMs(utcGuess, timeZone);
  return new Date(utcGuess.getTime() - offset);
}

export function pragueDayRangeToUtc(dateFilter: string): { startIso: string; endIso: string } {
  const [year, month, day] = dateFilter.split("-").map(Number);
  const start = zonedDateTimeToUtc(year, month, day, 0, 0, 0, PRAGUE_TIME_ZONE);
  const nextDay = new Date(Date.UTC(year, month - 1, day) + 86_400_000);
  const end = zonedDateTimeToUtc(
    nextDay.getUTCFullYear(),
    nextDay.getUTCMonth() + 1,
    nextDay.getUTCDate(),
    0,
    0,
    0,
    PRAGUE_TIME_ZONE,
  );

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

export function getEditionTypeLabel(editionType: string | null | undefined): string {
  if (!editionType) return "Vydání";
  return EDITION_TYPE_LABEL[editionType] ?? editionType;
}

export function getCategoryLabel(category: string | null | undefined): string {
  if (!category) return "Další";
  return CATEGORY_LABEL[category] ?? category;
}

export async function fetchLatestPublishedEdition(supabase: SupabaseClient) {
  return supabase
    .from("news_editions")
    .select(EDITION_SELECT)
    .eq("status", PUBLISHED_STATUS)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .returns<NewsEdition>()
    .maybeSingle();
}

export async function fetchPublishedEditionBySlug(supabase: SupabaseClient, slug: string) {
  return supabase
    .from("news_editions")
    .select(EDITION_SELECT)
    .eq("slug", slug)
    .eq("status", PUBLISHED_STATUS)
    .returns<NewsEdition>()
    .maybeSingle();
}

export async function fetchRecentPublishedEditions(supabase: SupabaseClient, limit: number) {
  return supabase
    .from("news_editions")
    .select(EDITION_SELECT)
    .eq("status", PUBLISHED_STATUS)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit)
    .returns<NewsEdition[]>();
}

export async function fetchPublishedEditionPage(
  supabase: SupabaseClient,
  opts: {
    page: number;
    pageSize: number;
    type: EditionTypeFilter | null;
    fromDate: string | null;
    toDate: string | null;
  },
) {
  let query = supabase
    .from("news_editions")
    .select(EDITION_SELECT, { count: "exact" })
    .eq("status", PUBLISHED_STATUS)
    .order("published_at", { ascending: false, nullsFirst: false });

  if (opts.type) {
    query = query.eq("edition_type", opts.type);
  }
  if (opts.fromDate) {
    const { startIso } = pragueDayRangeToUtc(opts.fromDate);
    query = query.gte("published_at", startIso);
  }
  if (opts.toDate) {
    const { endIso } = pragueDayRangeToUtc(opts.toDate);
    query = query.lt("published_at", endIso);
  }

  const from = (opts.page - 1) * opts.pageSize;
  const to = from + opts.pageSize - 1;

  return query.range(from, to).returns<NewsEdition[]>();
}

export async function fetchPublishedItemsForEdition(supabase: SupabaseClient, editionId: string) {
  return supabase
    .from("news_items")
    .select(ITEM_SELECT)
    .eq("edition_id", editionId)
    .eq("status", PUBLISHED_STATUS)
    .order("category", { ascending: true })
    .order("rank", { ascending: true })
    .returns<NewsItem[]>();
}

export async function fetchSourcesForItemIds(supabase: SupabaseClient, itemIds: string[]) {
  if (itemIds.length === 0) {
    return { data: [] as NewsSource[], error: null };
  }

  return supabase
    .from("news_sources")
    .select(SOURCE_SELECT)
    .in("news_item_id", itemIds)
    .returns<NewsSource[]>();
}

export function groupSourcesByItemId(sources: NewsSource[]): Map<string, NewsSource[]> {
  const map = new Map<string, NewsSource[]>();
  for (const source of sources) {
    const list = map.get(source.news_item_id) ?? [];
    list.push(source);
    map.set(source.news_item_id, list);
  }
  return map;
}

export async function fetchPublishedItemCountsByEditionIds(
  supabase: SupabaseClient,
  editionIds: string[],
) {
  const uniqueIds = Array.from(new Set(editionIds));
  if (uniqueIds.length === 0) {
    return { counts: new Map<string, number>(), error: null };
  }

  const { data, error } = await supabase
    .from("news_items")
    .select("id, edition_id")
    .eq("status", PUBLISHED_STATUS)
    .in("edition_id", uniqueIds);

  if (error) {
    return { counts: new Map<string, number>(), error };
  }

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const editionId = (row as { edition_id: string }).edition_id;
    counts.set(editionId, (counts.get(editionId) ?? 0) + 1);
  }

  return { counts, error: null };
}

export function orderedCategories(items: NewsItem[]): string[] {
  const present = new Set(items.map((item) => item.category ?? "other"));
  const known = CATEGORY_ORDER.filter((category) => present.has(category));
  const knownSet = new Set<string>(CATEGORY_ORDER);
  const custom = Array.from(present).filter((category) => !knownSet.has(category));
  return [...known, ...custom];
}

export function toCategoryGroups(items: NewsItem[]): Map<string, NewsItem[]> {
  const groups = new Map<string, NewsItem[]>();
  for (const item of items) {
    const category = item.category ?? "other";
    const list = groups.get(category) ?? [];
    list.push(item);
    groups.set(category, list);
  }
  return groups;
}

export async function fetchAdjacentPublishedEditions(
  supabase: SupabaseClient,
  edition: Pick<NewsEdition, "published_at" | "generated_at">,
) {
  const anchor = getEditionTimestamp(edition);
  if (!anchor) {
    return {
      previous: null as NewsEdition | null,
      next: null as NewsEdition | null,
      previousError: null,
      nextError: null,
    };
  }

  const anchorColumn = edition.published_at ? "published_at" : "generated_at";

  const [previousRes, nextRes] = await Promise.all([
    supabase
      .from("news_editions")
      .select(EDITION_SELECT)
      .eq("status", PUBLISHED_STATUS)
      .lt(anchorColumn, anchor)
      .order(anchorColumn, { ascending: false, nullsFirst: false })
      .limit(1)
      .returns<NewsEdition>()
      .maybeSingle(),
    supabase
      .from("news_editions")
      .select(EDITION_SELECT)
      .eq("status", PUBLISHED_STATUS)
      .gt(anchorColumn, anchor)
      .order(anchorColumn, { ascending: true, nullsFirst: false })
      .limit(1)
      .returns<NewsEdition>()
      .maybeSingle(),
  ]);

  return {
    previous: previousRes.data ?? null,
    next: nextRes.data ?? null,
    previousError: previousRes.error,
    nextError: nextRes.error,
  };
}

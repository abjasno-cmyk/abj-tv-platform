import type { FeedPost } from "@/lib/api";

export type VKostceFeedItem = {
  id: string;
  channel: string;
  headline: string;
  lead: string;
  body: string;
  displayAt: string;
  videoId: string;
  monthLabel: string;
  dayLabel: string;
  sourceLine: string;
};

function getPostTimestamp(post: FeedPost): number {
  const editorialAt = (post as FeedPost & { editorial_at?: string | null }).editorial_at;
  const updatedAt = (post as FeedPost & { updated_at?: string | null }).updated_at;
  const candidates = [editorialAt, updatedAt, post.created_at, post.video_published_at];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const parsed = Date.parse(candidate);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function getDisplayAt(post: FeedPost): string {
  return (
    (post as FeedPost & { editorial_at?: string | null }).editorial_at ??
    (post as FeedPost & { updated_at?: string | null }).updated_at ??
    post.created_at
  );
}

function getMonthLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("cs-CZ", {
    timeZone: "Europe/Prague",
    month: "long",
  })
    .format(date)
    .toLocaleUpperCase("cs-CZ");
}

function getDayLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("cs-CZ", {
    timeZone: "Europe/Prague",
    day: "numeric",
  }).format(date);
}

export function formatVKostceSourceDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "čas neuveden";
  const parts = new Intl.DateTimeFormat("cs-CZ", {
    timeZone: "Europe/Prague",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const day = parts.find((part) => part.type === "day")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const hour = parts.find((part) => part.type === "hour")?.value ?? "";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "";
  return `${day}. ${month}. ${hour}:${minute}`;
}

function splitPerex(what: string, why: string | null, impact: string | null): { lead: string; body: string } {
  const trimmed = what.trim();
  if (!trimmed) {
    const fallback = [why?.trim(), impact?.trim()].filter(Boolean).join("\n\n");
    return { lead: "", body: fallback };
  }

  const blocks = trimmed.split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean);
  const lead = blocks[0] ?? trimmed;
  const bodyParts = [...(blocks.length > 1 ? blocks.slice(1) : []), why?.trim(), impact?.trim()].filter(Boolean);
  return { lead, body: bodyParts.join("\n\n") };
}

export function mapPostToVKostceItem(post: FeedPost): VKostceFeedItem {
  const displayAt = getDisplayAt(post);
  const channel = post.channel_name?.trim() || "Neznámý kanál";
  const headline = post.headline?.trim() || post.what?.trim() || "Bez titulku";
  const what = post.what?.trim() || "";
  const why = post.why?.trim() || null;
  const impact = post.impact?.trim() || null;
  const { lead, body } = splitPerex(what, why, impact);

  return {
    id: post.id,
    channel,
    headline,
    lead,
    body,
    displayAt,
    videoId: post.video_id,
    monthLabel: getMonthLabel(displayAt),
    dayLabel: getDayLabel(displayAt),
    sourceLine: `${channel}  ${formatVKostceSourceDate(displayAt)}`,
  };
}

export function sortVKostceItems(posts: FeedPost[], items: VKostceFeedItem[]): VKostceFeedItem[] {
  return [...items].sort((a, b) => {
    const sourceA = posts.find((post) => post.id === a.id) ?? null;
    const sourceB = posts.find((post) => post.id === b.id) ?? null;
    const aTs = sourceA ? getPostTimestamp(sourceA) : Date.parse(a.displayAt);
    const bTs = sourceB ? getPostTimestamp(sourceB) : Date.parse(b.displayAt);
    if (!Number.isFinite(aTs) && !Number.isFinite(bTs)) return 0;
    if (!Number.isFinite(aTs)) return 1;
    if (!Number.isFinite(bTs)) return -1;
    return bTs - aTs;
  });
}

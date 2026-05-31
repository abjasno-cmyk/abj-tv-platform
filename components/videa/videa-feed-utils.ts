import type { FeedPost } from "@/lib/api";

export type VideaVideoItem = {
  key: string;
  videoId: string;
  title: string;
  channel: string;
  publishedAt: string;
  thumbnail: string;
  perex: string | null;
  aspect: "landscape" | "portrait";
  monthLabel: string;
  dayLabel: string;
};

function readString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function readBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

function pickFirstString(raw: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = readString(raw[key]);
    if (value) return value;
  }
  return null;
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function parseAspectRatioValue(value: string): number | null {
  const cleaned = value.trim();
  if (!cleaned) return null;
  if (cleaned.includes(":")) {
    const [left, right] = cleaned.split(":").map((part) => Number(part));
    if (Number.isFinite(left) && Number.isFinite(right) && right > 0) return left / right;
    return null;
  }
  if (cleaned.includes("/")) {
    const [left, right] = cleaned.split("/").map((part) => Number(part));
    if (Number.isFinite(left) && Number.isFinite(right) && right > 0) return left / right;
    return null;
  }
  const numeric = Number(cleaned);
  if (Number.isFinite(numeric) && numeric > 0) return numeric;
  return null;
}

export function resolveVideaAspect(post: FeedPost): "landscape" | "portrait" {
  const raw = post as FeedPost & Record<string, unknown>;
  const width = readNumber(raw.width);
  const height = readNumber(raw.height);
  if (width !== null && height !== null && height > 0) {
    return height > width ? "portrait" : "landscape";
  }

  const aspectRaw = pickFirstString(raw, ["aspect_ratio", "aspectRatio"]);
  const parsedAspect = aspectRaw ? parseAspectRatioValue(aspectRaw) : null;
  if (parsedAspect !== null) return parsedAspect < 1 ? "portrait" : "landscape";

  const orientation = normalizeText(pickFirstString(raw, ["orientation", "video_orientation"]) ?? "");
  if (orientation.includes("portrait") || orientation.includes("vertical")) return "portrait";
  if (orientation.includes("landscape") || orientation.includes("horizontal")) return "landscape";

  if (readBoolean(raw.is_short) ?? readBoolean(raw.isShort)) return "portrait";
  const formatNormalized = normalizeText(pickFirstString(raw, ["format", "video_format"]) ?? "");
  if (formatNormalized.includes("short")) return "portrait";

  const textHint = normalizeText(`${post.headline} ${post.what} ${(post.tags ?? []).join(" ")}`);
  if (textHint.includes("shorts") || textHint.includes("#shorts")) return "portrait";

  return "landscape";
}

export function resolveVideaDateParts(value: string | null | undefined): { monthLabel: string; dayLabel: string; sortTs: number } {
  if (!value) {
    return { monthLabel: "DATUM", dayLabel: "--", sortTs: 0 };
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { monthLabel: "DATUM", dayLabel: "--", sortTs: 0 };
  }

  const monthLabel = new Intl.DateTimeFormat("cs-CZ", {
    timeZone: "Europe/Prague",
    month: "long",
  })
    .format(date)
    .toLocaleUpperCase("cs-CZ");

  const dayLabel = new Intl.DateTimeFormat("cs-CZ", {
    timeZone: "Europe/Prague",
    day: "numeric",
  }).format(date);

  return { monthLabel, dayLabel, sortTs: date.getTime() };
}

export function mapPostToVideaVideo(post: FeedPost): VideaVideoItem {
  const raw = post as FeedPost & Record<string, unknown>;
  const videoId = readString(post.video_id) ?? "";
  const publishedAt = post.video_published_at ?? post.created_at;
  const dateParts = resolveVideaDateParts(publishedAt);
  const thumbnail =
    pickFirstString(raw, ["thumbnail_url", "thumbnail", "image_url", "image", "preview_url"]) ??
    (videoId ? `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg` : "/placeholder-thumb.jpg");

  const perex = readString(post.what) ?? readString(post.why) ?? readString(post.impact);

  return {
    key: videoId || `${post.id}-${publishedAt}`,
    videoId,
    title: post.headline?.trim() || post.what?.trim() || "Bez titulku",
    channel: post.channel_name?.trim() || "Neznámý kanál",
    publishedAt,
    thumbnail,
    perex,
    aspect: resolveVideaAspect(post),
    monthLabel: dateParts.monthLabel,
    dayLabel: dateParts.dayLabel,
  };
}

export function parsePublishedMs(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function dedupeVideaVideos(videos: VideaVideoItem[]): VideaVideoItem[] {
  const seenIds = new Set<string>();
  const seenTitleChannel = new Set<string>();
  const result: VideaVideoItem[] = [];

  for (const video of videos) {
    const idKey = video.videoId.trim();
    const titleKey = `${normalizeText(video.title)}|${normalizeText(video.channel)}`;
    if (idKey && seenIds.has(idKey)) continue;
    if (seenTitleChannel.has(titleKey)) continue;
    if (idKey) seenIds.add(idKey);
    seenTitleChannel.add(titleKey);
    result.push(video);
  }

  return result;
}

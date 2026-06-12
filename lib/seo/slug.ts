import { slugifyText } from "@/lib/nazory/slug";

const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{6,20}$/;
const SLUG_DATE_SUFFIX_PATTERN = /-(\d{4}-\d{2}-\d{2})-(.+)$/;

function formatPragueDateKey(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Prague",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (!year || !month || !day) return null;
  return `${year}-${month}-${day}`;
}

export function buildVideoSlug(input: {
  title: string;
  publishedAt: string | null | undefined;
  videoId: string;
}): string | null {
  const videoId = input.videoId.trim();
  if (!YOUTUBE_VIDEO_ID_PATTERN.test(videoId)) return null;

  const titleSlug = slugifyText(input.title, 72);
  if (!titleSlug) return null;

  const dateSlug = formatPragueDateKey(input.publishedAt);
  if (!dateSlug) return null;

  return `${titleSlug}-${dateSlug}-${videoId}`;
}

export function parseVideoSlug(slug: string): { videoId: string } | null {
  const trimmed = slug.trim();
  const match = trimmed.match(SLUG_DATE_SUFFIX_PATTERN);
  if (!match) return null;

  const videoId = match[2].trim();
  if (!YOUTUBE_VIDEO_ID_PATTERN.test(videoId)) return null;

  return { videoId };
}

export function videoSeoPath(slug: string): string {
  return `/video/${encodeURIComponent(slug.trim())}`;
}

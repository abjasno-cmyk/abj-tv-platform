"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import { useFeed } from "@/hooks/useFeed";
import type { FeedPost } from "@/lib/api";

const EMPTY_MESSAGE = "Zatím nejsou dostupná žádná nová videa.";
const LATEST_VIDEO_LIMIT = 16;
const CHANNEL_PANEL_VIDEO_LIMIT = 4;
const CHANNEL_TARGET_COUNT = 50;
const CHANNEL_AUTO_LOAD_MAX_PAGES = 18;

type CountryCode = "CZ" | "SK" | null;
type ChannelFilter = "ALL" | "CZ" | "SK";
type VideoAspect = "landscape" | "portrait";

export type ArchivViewData = {
  topForDisplay: FeedVideoView[];
  channels: Array<{ channel: string; videos: FeedVideoView[] }>;
};

type FeedVideoView = {
  video_id: string;
  title: string;
  channel: string;
  published_at: string;
  topics: string[];
  thumbnail: string | null;
  tldr?: string;
  context?: string;
  impact?: string;
  duration_seconds?: number | null;
  language?: string | null;
  country?: string | null;
  locale?: string | null;
  channel_logo?: string | null;
  youtube_url?: string | null;
  aspect_ratio?: string | null;
  width?: number | null;
  height?: number | null;
  orientation?: string | null;
  is_short?: boolean | null;
  format?: string | null;
  freshness: "breaking" | "today" | "week" | "evergreen";
};

type FeedResponseView = {
  top: FeedVideoView[];
  channels: Record<string, FeedVideoView[]>;
};

type StructuredFeedPayloadView = {
  top?: unknown[];
  channels?: Record<string, unknown[]>;
};

type ChannelSummary = {
  key: string;
  name: string;
  videos: FeedVideoView[];
  logoUrl: string | null;
  country: CountryCode;
  latestPublishedAt: number;
};

const KNOWN_CHANNEL_COUNTRY_HINTS: Array<{ pattern: RegExp; country: CountryCode }> = [
  { pattern: /\b(abj|aby bylo jasno|xtv|xaver|vajicko|vajíčko)\b/i, country: "CZ" },
  { pattern: /\b(infovojna|slobodny vysielac|slobodný vysielač|tv slovan)\b/i, country: "SK" },
];

const AVATAR_GRADIENTS: Array<[string, string]> = [
  ["#FF6A00", "#F0983B"],
  ["#4250A0", "#7C92F1"],
  ["#0F766E", "#22A6A0"],
  ["#A16207", "#D79F2A"],
  ["#6D28D9", "#9F67F3"],
  ["#BE185D", "#E54886"],
];

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function deduplicateVideos(videos: FeedVideoView[]): FeedVideoView[] {
  const seenVideoIds = new Set<string>();
  const seenTitleChannel = new Set<string>();
  const deduped: FeedVideoView[] = [];

  for (const video of videos) {
    const videoIdKey = video.video_id.trim();
    const titleChannelKey = `${normalizeText(video.title)}|${normalizeText(video.channel)}`;
    if (videoIdKey && seenVideoIds.has(videoIdKey)) continue;
    if (seenTitleChannel.has(titleChannelKey)) continue;

    if (videoIdKey) seenVideoIds.add(videoIdKey);
    seenTitleChannel.add(titleChannelKey);
    deduped.push(video);
  }

  return deduped;
}

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
  if (typeof value === "number") return value > 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1" || normalized === "yes") return true;
    if (normalized === "false" || normalized === "0" || normalized === "no") return false;
  }
  return null;
}

function pickFirstString(source: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = readString(source[key]);
    if (value) return value;
  }
  return null;
}

function parseTimestamp(value: string | null | undefined): number {
  if (!value) return 0;
  const ts = new Date(value).getTime();
  return Number.isFinite(ts) ? ts : 0;
}

function formatPublishedLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("cs-CZ", {
    timeZone: "Europe/Prague",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

type EditorialDateGroup = {
  key: string;
  dayLabel: string;
  monthLabel: string;
  yearLabel: string;
  videos: FeedVideoView[];
  sortTimestamp: number;
};

function resolveEditorialDateParts(value: string | null | undefined): {
  key: string;
  dayLabel: string;
  monthLabel: string;
  yearLabel: string;
  sortTimestamp: number;
} {
  if (!value) {
    return {
      key: "nezname-datum",
      dayLabel: "--",
      monthLabel: "DATUM",
      yearLabel: "",
      sortTimestamp: 0,
    };
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return {
      key: "nezname-datum",
      dayLabel: "--",
      monthLabel: "DATUM",
      yearLabel: "",
      sortTimestamp: 0,
    };
  }

  const formatDateKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Prague",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  const dayLabel = new Intl.DateTimeFormat("cs-CZ", {
    timeZone: "Europe/Prague",
    day: "2-digit",
  }).format(date);
  const monthLabel = new Intl.DateTimeFormat("cs-CZ", {
    timeZone: "Europe/Prague",
    month: "short",
  })
    .format(date)
    .replace(".", "")
    .toUpperCase();
  const yearLabel = new Intl.DateTimeFormat("cs-CZ", {
    timeZone: "Europe/Prague",
    year: "numeric",
  }).format(date);

  return {
    key: formatDateKey,
    dayLabel,
    monthLabel,
    yearLabel,
    sortTimestamp: date.getTime(),
  };
}

function groupVideosByEditorialDate(videos: FeedVideoView[]): EditorialDateGroup[] {
  const groups = new Map<string, EditorialDateGroup>();
  for (const video of videos) {
    const parts = resolveEditorialDateParts(video.published_at);
    const existing = groups.get(parts.key);
    if (existing) {
      existing.videos.push(video);
      if (parts.sortTimestamp > existing.sortTimestamp) {
        existing.sortTimestamp = parts.sortTimestamp;
      }
      continue;
    }
    groups.set(parts.key, {
      key: parts.key,
      dayLabel: parts.dayLabel,
      monthLabel: parts.monthLabel,
      yearLabel: parts.yearLabel,
      videos: [video],
      sortTimestamp: parts.sortTimestamp,
    });
  }

  return [...groups.values()].sort((a, b) => b.sortTimestamp - a.sortTimestamp);
}

function sortNewest(videos: FeedVideoView[]): FeedVideoView[] {
  return [...videos].sort((a, b) => parseTimestamp(b.published_at) - parseTimestamp(a.published_at));
}

function formatDurationLabel(value: number | null | undefined): string | null {
  if (!Number.isFinite(value) || !value || value <= 0) return null;
  const total = Math.floor(value);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function videoUniqKey(video: FeedVideoView): string {
  const idKey = video.video_id.trim();
  if (idKey) return idKey;
  return `${normalizeText(video.title)}|${normalizeText(video.channel)}`;
}

function deduplicateBySeen(video: FeedVideoView, seen: Set<string>): boolean {
  const key = videoUniqKey(video);
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
}

function isAbjChannel(channelName: string): boolean {
  const normalized = normalizeText(channelName);
  return normalized.includes("abj") || normalized.includes("aby bylo jasno");
}

function inferCountryFromLocale(value: string | null | undefined): CountryCode {
  const normalized = normalizeText(value ?? "");
  if (!normalized) return null;
  if (normalized === "cz" || normalized === "cs" || normalized.includes("cs-cz") || normalized.includes("cz-cz")) {
    return "CZ";
  }
  if (normalized === "sk" || normalized === "sk-sk" || normalized.includes("sk")) {
    return "SK";
  }
  return null;
}

function inferCountryFromName(channelName: string): CountryCode {
  for (const hint of KNOWN_CHANNEL_COUNTRY_HINTS) {
    if (hint.pattern.test(channelName)) return hint.country;
  }
  const normalized = normalizeText(channelName);
  if (normalized.includes("slovensko") || normalized.includes("slovak")) return "SK";
  if (normalized.includes("cesko") || normalized.includes("cesky") || normalized.includes("ceska")) return "CZ";
  return null;
}

function inferCountryFromVideo(video: FeedVideoView): CountryCode {
  return (
    inferCountryFromLocale(video.country) ??
    inferCountryFromLocale(video.locale) ??
    inferCountryFromLocale(video.language)
  );
}

function resolveChannelCountry(channelName: string, videos: FeedVideoView[]): CountryCode {
  let cz = 0;
  let sk = 0;
  for (const video of videos) {
    const inferred = inferCountryFromVideo(video);
    if (inferred === "CZ") cz += 1;
    if (inferred === "SK") sk += 1;
  }
  if (cz > sk && cz > 0) return "CZ";
  if (sk > cz && sk > 0) return "SK";
  return inferCountryFromName(channelName);
}

function parseAspectRatioValue(rawValue: string): number | null {
  const cleaned = rawValue.trim().toLowerCase();
  if (!cleaned) return null;
  if (cleaned.includes(":")) {
    const [left, right] = cleaned.split(":").map((value) => Number(value));
    if (Number.isFinite(left) && Number.isFinite(right) && right > 0) return left / right;
    return null;
  }
  if (cleaned.includes("/")) {
    const [left, right] = cleaned.split("/").map((value) => Number(value));
    if (Number.isFinite(left) && Number.isFinite(right) && right > 0) return left / right;
    return null;
  }
  const numeric = Number(cleaned);
  if (Number.isFinite(numeric) && numeric > 0) return numeric;
  return null;
}

function getVideoAspectRatio(video: FeedVideoView): VideoAspect {
  if (Number.isFinite(video.width) && Number.isFinite(video.height) && (video.height ?? 0) > 0) {
    return (video.height ?? 0) > (video.width ?? 0) ? "portrait" : "landscape";
  }

  const parsedAspect = video.aspect_ratio ? parseAspectRatioValue(video.aspect_ratio) : null;
  if (parsedAspect !== null) return parsedAspect < 1 ? "portrait" : "landscape";

  const orientation = normalizeText(video.orientation ?? "");
  if (orientation.includes("portrait") || orientation.includes("vertical")) return "portrait";
  if (orientation.includes("landscape") || orientation.includes("horizontal")) return "landscape";

  if (video.is_short) return "portrait";
  const formatNormalized = normalizeText(video.format ?? "");
  if (formatNormalized.includes("short")) return "portrait";

  const textHint = normalizeText(`${video.title} ${video.tldr ?? ""} ${(video.topics ?? []).join(" ")}`);
  if (textHint.includes("shorts") || textHint.includes("#shorts")) return "portrait";

  return "landscape";
}

function extractYoutubeVideoId(value: string | null | undefined): string | null {
  const raw = readString(value);
  if (!raw) return null;
  const youtuBe = raw.match(/youtu\.be\/([a-zA-Z0-9_-]{6,})/);
  if (youtuBe?.[1]) return youtuBe[1];
  const query = raw.match(/[?&]v=([a-zA-Z0-9_-]{6,})/);
  if (query?.[1]) return query[1];
  const shorts = raw.match(/shorts\/([a-zA-Z0-9_-]{6,})/);
  if (shorts?.[1]) return shorts[1];
  const embed = raw.match(/embed\/([a-zA-Z0-9_-]{6,})/);
  if (embed?.[1]) return embed[1];
  return null;
}

function getEffectiveVideoId(video: FeedVideoView): string | null {
  if (video.video_id?.trim()) return video.video_id.trim();
  return extractYoutubeVideoId(video.youtube_url);
}

function getYoutubeEmbedUrl(video: FeedVideoView): string | null {
  const videoId = getEffectiveVideoId(video);
  if (!videoId) return null;
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?rel=0&modestbranding=1&playsinline=1`;
}

function getYoutubeAutoplayEmbedUrl(video: FeedVideoView): string | null {
  const base = getYoutubeEmbedUrl(video);
  if (!base) return null;
  const join = base.includes("?") ? "&" : "?";
  return `${base}${join}autoplay=1&iv_load_policy=3&disablekb=1`;
}

function getVideoExternalUrl(video: FeedVideoView): string | null {
  const videoId = getEffectiveVideoId(video);
  if (videoId) {
    return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
  }
  const fallback = readString(video.youtube_url);
  if (fallback && /^https?:\/\//i.test(fallback)) return fallback;
  return null;
}

function getChannelInitials(channelName: string): string {
  const cleaned = channelName
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (cleaned.length === 0) return "CH";
  if (cleaned.length === 1) return cleaned[0].slice(0, 2).toUpperCase();
  return `${cleaned[0].charAt(0)}${cleaned[1].charAt(0)}`.toUpperCase();
}

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getChannelAvatarGradient(channelName: string): string {
  const [left, right] = AVATAR_GRADIENTS[hashString(normalizeText(channelName)) % AVATAR_GRADIENTS.length];
  return `linear-gradient(135deg, ${left}, ${right})`;
}

function getChannelAccentColor(channelName: string): string {
  const [left] = AVATAR_GRADIENTS[hashString(normalizeText(channelName)) % AVATAR_GRADIENTS.length];
  return left;
}

function groupVideosByChannel(videos: FeedVideoView[]): ChannelSummary[] {
  const grouped = new Map<string, ChannelSummary>();
  for (const video of videos) {
    const channelName = video.channel?.trim() || "Neznámý kanál";
    const key = normalizeText(channelName) || "neznamy-kanal";
    const existing = grouped.get(key);
    if (!existing) {
      grouped.set(key, {
        key,
        name: channelName,
        videos: [video],
        logoUrl: video.channel_logo ?? null,
        country: null,
        latestPublishedAt: parseTimestamp(video.published_at),
      });
      continue;
    }

    existing.videos.push(video);
    if (!existing.logoUrl && video.channel_logo) {
      existing.logoUrl = video.channel_logo;
    }
    if (channelName.length > existing.name.length) {
      existing.name = channelName;
    }
  }

  return [...grouped.values()]
    .map((entry) => {
      const sortedVideos = sortNewest(deduplicateVideos(entry.videos));
      return {
        ...entry,
        videos: sortedVideos,
        latestPublishedAt: parseTimestamp(sortedVideos[0]?.published_at),
        country: resolveChannelCountry(entry.name, sortedVideos),
      };
    })
    .sort((a, b) => {
      const aAbj = isAbjChannel(a.name);
      const bAbj = isAbjChannel(b.name);
      if (aAbj !== bAbj) return aAbj ? -1 : 1;
      if (b.videos.length !== a.videos.length) return b.videos.length - a.videos.length;
      if (b.latestPublishedAt !== a.latestPublishedAt) return b.latestPublishedAt - a.latestPublishedAt;
      return a.name.localeCompare(b.name, "cs");
    });
}

function mapPostToFeedVideo(post: FeedPost): FeedVideoView {
  const raw = post as FeedPost & Record<string, unknown>;
  const videoId = readString(post.video_id) ?? "";
  const fallbackThumbnail = videoId
    ? `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`
    : "/placeholder-thumb.jpg";

  return {
    video_id: videoId,
    title: post.headline?.trim() || post.what?.trim() || "Bez titulku",
    channel: post.channel_name || "Neznámý kanál",
    published_at: post.video_published_at ?? post.created_at,
    topics: post.tags ?? [],
    thumbnail:
      pickFirstString(raw, ["thumbnail_url", "thumbnail", "image_url", "image", "preview_url"]) ?? fallbackThumbnail,
    tldr: post.what,
    context: post.why ?? undefined,
    impact: post.impact ?? undefined,
    duration_seconds:
      readNumber(raw.duration_seconds) ??
      readNumber(raw.duration_sec) ??
      readNumber(raw.duration_s) ??
      readNumber(raw.length_seconds) ??
      null,
    language: readString(post.language),
    country: pickFirstString(raw, ["country", "channel_country"]),
    locale: pickFirstString(raw, ["locale", "channel_locale"]),
    channel_logo: pickFirstString(raw, [
      "channel_logo",
      "channel_avatar",
      "channel_thumbnail",
      "channel_image",
      "channel_image_url",
      "channel_logo_url",
      "avatar_url",
      "logo_url",
    ]),
    youtube_url: pickFirstString(raw, ["youtube_url", "youtubeUrl", "video_url", "url"]),
    aspect_ratio: pickFirstString(raw, ["aspect_ratio", "aspectRatio"]),
    width: readNumber(raw.width),
    height: readNumber(raw.height),
    orientation: pickFirstString(raw, ["orientation", "video_orientation"]),
    is_short: readBoolean(raw.is_short) ?? readBoolean(raw.isShort),
    format: pickFirstString(raw, ["format", "video_format"]),
    freshness: post.freshness,
  };
}

function mapStructuredFeedVideo(rawVideo: unknown): FeedVideoView | null {
  if (!rawVideo || typeof rawVideo !== "object" || Array.isArray(rawVideo)) return null;
  const row = rawVideo as Record<string, unknown>;
  const videoId = readString(row.video_id) ?? extractYoutubeVideoId(readString(row.youtube_url)) ?? "";
  const title = readString(row.title) ?? "Bez titulku";
  const channelName = readString(row.channel) ?? readString(row.channel_name) ?? "Neznámý kanál";
  const publishedAt = readString(row.published_at) ?? new Date(0).toISOString();
  const thumbnail =
    pickFirstString(row, ["thumbnail", "thumbnail_url", "image_url", "image", "preview_url"]) ??
    (videoId ? `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg` : "/placeholder-thumb.jpg");
  const topics = Array.isArray(row.topics) ? row.topics.filter((topic): topic is string => typeof topic === "string") : [];
  const freshnessRaw = normalizeText(readString(row.freshness) ?? "");
  const freshness: FeedVideoView["freshness"] =
    freshnessRaw === "breaking" || freshnessRaw === "today" || freshnessRaw === "week" || freshnessRaw === "evergreen"
      ? freshnessRaw
      : "evergreen";

  return {
    video_id: videoId,
    title,
    channel: channelName,
    published_at: publishedAt,
    topics,
    thumbnail,
    tldr: readString(row.tldr) ?? undefined,
    context: readString(row.context) ?? undefined,
    impact: readString(row.impact) ?? undefined,
    duration_seconds:
      readNumber(row.duration_seconds) ??
      readNumber(row.duration_sec) ??
      readNumber(row.duration_s) ??
      readNumber(row.length_seconds) ??
      null,
    language: readString(row.language),
    country: readString(row.country),
    locale: readString(row.locale),
    channel_logo: pickFirstString(row, ["channel_logo", "channel_avatar", "channel_thumbnail", "avatar_url", "logo_url"]),
    youtube_url: pickFirstString(row, ["youtube_url", "youtubeUrl", "video_url", "url"]),
    aspect_ratio: pickFirstString(row, ["aspect_ratio", "aspectRatio"]),
    width: readNumber(row.width),
    height: readNumber(row.height),
    orientation: pickFirstString(row, ["orientation", "video_orientation"]),
    is_short: readBoolean(row.is_short) ?? readBoolean(row.isShort),
    format: pickFirstString(row, ["format", "video_format"]),
    freshness,
  };
}

function mapStructuredFeedPayload(payload: StructuredFeedPayloadView | null): FeedResponseView {
  if (!payload) return { top: [], channels: {} };
  const top = Array.isArray(payload.top) ? payload.top.map(mapStructuredFeedVideo).filter((entry): entry is FeedVideoView => Boolean(entry)) : [];
  const channels = Object.entries(payload.channels ?? {}).reduce<Record<string, FeedVideoView[]>>((acc, [channelName, rows]) => {
    const mapped = (rows ?? []).map(mapStructuredFeedVideo).filter((entry): entry is FeedVideoView => Boolean(entry));
    if (mapped.length === 0) return acc;
    acc[channelName] = mapped;
    return acc;
  }, {});
  return {
    top: deduplicateVideos(top),
    channels,
  };
}

type ArchivClientProps = {
  initialData: ArchivViewData;
  mode?: "default" | "videa";
};

function mergePayload(current: FeedResponseView, incoming: FeedResponseView): FeedResponseView {
  const mergedTop = sortNewest(deduplicateVideos([...incoming.top, ...current.top]));
  const mergedChannels: Record<string, FeedVideoView[]> = { ...current.channels };

  for (const [channel, videos] of Object.entries(incoming.channels)) {
    mergedChannels[channel] = sortNewest(deduplicateVideos([...(mergedChannels[channel] ?? []), ...videos]));
  }

  return {
    ...current,
    top: mergedTop,
    channels: mergedChannels,
  };
}

type ArchiveVideoCardProps = {
  video: FeedVideoView;
  variant?: "hero" | "featured" | "compact";
  tag?: string;
  accent?: boolean;
  editorial?: boolean;
};

function ArchiveVideoCard({ video, variant = "compact", tag, accent = false, editorial = false }: ArchiveVideoCardProps) {
  const videoId = getEffectiveVideoId(video);
  const [expanded, setExpanded] = useState(false);
  const [startedPlayback, setStartedPlayback] = useState(false);
  const externalHref = getVideoExternalUrl(video);
  const embedUrl = getYoutubeAutoplayEmbedUrl(video);
  const isDisabled = !videoId && !externalHref;
  const publishedLabel = formatPublishedLabel(video.published_at);
  const thumbnailSrc = readString(video.thumbnail) ?? "/placeholder-thumb.jpg";
  const isHero = variant === "hero";
  const isFeatured = variant === "featured";
  const isCompact = variant === "compact";
  const compactEditorial = isCompact && editorial;
  const durationLabel = formatDurationLabel(video.duration_seconds);
  const aspect = getVideoAspectRatio(video);
  const isPortrait = aspect === "portrait";
  const mediaRatioClass = isPortrait
    ? isHero
      ? "mx-auto aspect-[9/16] max-h-[70vh] max-w-[360px]"
      : "aspect-[9/16]"
    : "aspect-video";

  return (
    <article
      className={`group block overflow-hidden border bg-white transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 ${
        compactEditorial ? "focus-visible:ring-[#ED742F]/45" : "focus-visible:ring-[#FF6A00]/60"
      } ${
        compactEditorial
          ? "rounded-[20px] border-[rgba(17,17,17,0.14)]"
          : `rounded-2xl ${
              accent
                ? "border-[#FF6A00]/35 shadow-[0_8px_24px_rgba(255,106,0,0.12)] hover:border-[#FF6A00]/55"
                : "border-[var(--abj-gold-dim)] shadow-[0_8px_22px_rgba(17,17,17,0.08)] hover:border-[rgba(17,17,17,0.28)]"
            }`
      } ${
        isDisabled
          ? "cursor-default opacity-70"
          : compactEditorial
            ? "hover:border-[#ED742F]/45"
            : "hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(17,17,17,0.12)]"
      }`}
    >
      <button
        type="button"
        className="w-full text-left"
        disabled={isDisabled}
        onClick={() => {
          const nextExpanded = !expanded;
          setExpanded(nextExpanded);
          if (!nextExpanded) {
            setStartedPlayback(false);
          }
        }}
      >
        <div className={`relative overflow-hidden bg-[#F2F2F2] ${mediaRatioClass} ${compactEditorial ? "rounded-none" : ""}`}>
          <Image
            src={thumbnailSrc}
            alt={video.title}
            fill
            loading="lazy"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            sizes={
              isHero
                ? "(max-width: 1024px) 100vw, 66vw"
                : isFeatured
                  ? "(max-width: 1024px) 100vw, 33vw"
                  : compactEditorial
                    ? "(max-width: 768px) 100vw, (max-width: 1280px) 68vw, 48vw"
                    : "(max-width: 768px) 100vw, (max-width: 1400px) 33vw, 25vw"
            }
            unoptimized={thumbnailSrc.startsWith("http")}
          />
          {tag && !compactEditorial ? (
            <span className="absolute left-2 top-2 rounded-full border border-[#FF6A00]/35 bg-white/95 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#C14900]">
              {tag}
            </span>
          ) : null}
          {durationLabel && !compactEditorial ? (
            <span className="absolute bottom-2 right-2 rounded bg-black/75 px-1.5 py-0.5 text-[10px] font-medium text-white">
              {durationLabel}
            </span>
          ) : null}
          {isHero ? (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/45 to-transparent px-3 pb-3 pt-10 text-white">
              <p className="line-clamp-2 font-[var(--font-serif)] text-[22px] leading-tight">{video.title}</p>
              <p className="mt-2 text-xs text-white/85">
                {video.channel}
                {publishedLabel ? ` · ${publishedLabel}` : ""}
              </p>
            </div>
          ) : null}
        </div>

        {!isHero ? (
          <div className={compactEditorial ? "space-y-2 px-4 py-4 sm:px-5" : isFeatured ? "space-y-1.5 p-3.5" : "space-y-1 p-3"}>
            <p
              className={`line-clamp-2 text-abj-text1 ${
                compactEditorial ? "text-[clamp(1.02rem,1.6vw,1.18rem)] font-semibold leading-snug" : isFeatured ? "text-[15px] font-semibold leading-snug" : "text-sm font-medium"
              }`}
            >
              {video.title}
            </p>
            {compactEditorial ? (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-abj-text2">
                <span className="truncate font-medium">{video.channel}</span>
                {publishedLabel ? <span className="text-abj-text3">{publishedLabel}</span> : null}
              </div>
            ) : (
              <>
                <p className="truncate text-xs font-medium text-abj-text2">{video.channel}</p>
                {publishedLabel ? <p className="text-[11px] text-abj-text3">{publishedLabel}</p> : null}
              </>
            )}
            <p className={`text-[11px] font-semibold uppercase tracking-[0.1em] ${compactEditorial ? "text-[#ED742F]" : "text-[#C14900]"}`}>
              {expanded ? "Skrýt video" : compactEditorial ? "Zobrazit detail" : "Rozkliknout video"}
            </p>
          </div>
        ) : null}
      </button>

      {expanded ? (
        <div
          className={`space-y-2 border-t p-3 ${
            compactEditorial
              ? "border-[rgba(17,17,17,0.12)] bg-[rgba(237,116,47,0.05)] sm:p-4"
              : "border-[var(--abj-gold-dim)] bg-[rgba(255,106,0,0.03)]"
          }`}
        >
          {embedUrl ? (
            <div
              className={`overflow-hidden rounded-lg bg-black ${
                compactEditorial ? "border border-[#ED742F]/30" : "border border-[rgba(255,106,0,0.25)]"
              }`}
            >
              {!startedPlayback ? (
                <button
                  type="button"
                  className={`flex aspect-video w-full items-center justify-center ${
                    compactEditorial
                      ? "bg-[radial-gradient(circle_at_center,rgba(237,116,47,0.22),rgba(0,0,0,0.84))]"
                      : "bg-[radial-gradient(circle_at_center,rgba(255,106,0,0.22),rgba(0,0,0,0.8))]"
                  }`}
                  onClick={() => setStartedPlayback(true)}
                >
                  <span
                    className={`rounded-full bg-[rgba(255,255,255,0.1)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white ${
                      compactEditorial ? "border border-[#ED742F]/60" : "border border-[rgba(255,106,0,0.4)]"
                    }`}
                  >
                    Přehrát video
                  </span>
                </button>
              ) : (
                <iframe
                  title={video.title}
                  className="aspect-video w-full"
                  src={embedUrl}
                  allow="autoplay; encrypted-media; picture-in-picture"
                  sandbox="allow-scripts allow-same-origin allow-presentation"
                  referrerPolicy="origin"
                  allowFullScreen
                />
              )}
            </div>
          ) : (
            <p className="text-sm text-abj-text2">Video nelze vložit do přehrávače.</p>
          )}
        </div>
      ) : null}
    </article>
  );
}

function VideoCardSkeleton({ variant = "compact" }: { variant?: "hero" | "featured" | "compact" }) {
  const isHero = variant === "hero";
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl border border-[var(--abj-gold-dim)] bg-white">
      <div className="aspect-video bg-[rgba(17,17,17,0.08)]" />
      {!isHero ? (
        <div className="space-y-2 p-3">
          <div className="h-4 w-[85%] rounded bg-[rgba(17,17,17,0.1)]" />
          <div className="h-4 w-[65%] rounded bg-[rgba(17,17,17,0.08)]" />
          <div className="h-3 w-24 rounded bg-[rgba(17,17,17,0.08)]" />
        </div>
      ) : null}
    </div>
  );
}

function CountryBadge({ country }: { country: CountryCode }) {
  if (!country) return null;
  const flagGradient =
    country === "CZ"
      ? "linear-gradient(135deg, #11457E 0%, #11457E 38%, #FFFFFF 38%, #FFFFFF 70%, #D7141A 70%)"
      : "linear-gradient(135deg, #0B4EA2 0%, #0B4EA2 25%, #FFFFFF 25%, #FFFFFF 62%, #EE1C25 62%)";

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[rgba(17,17,17,0.16)] bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-abj-text2">
      <span
        className="inline-block h-[10px] w-[14px] rounded-[2px] border border-[rgba(17,17,17,0.1)]"
        style={{ backgroundImage: flagGradient }}
        aria-hidden="true"
      />
      {country}
    </span>
  );
}

function ChannelAvatar({ channelName, logoUrl, size = "md" }: { channelName: string; logoUrl: string | null; size?: "sm" | "md" }) {
  const [imageFailed, setImageFailed] = useState(false);
  const sizeClass = size === "sm" ? "h-9 w-9 text-xs" : "h-11 w-11 text-sm";
  const initials = getChannelInitials(channelName);
  const shouldRenderImage = Boolean(logoUrl) && !imageFailed;

  return (
    <span className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ${sizeClass}`}>
      {shouldRenderImage ? (
        <Image
          src={logoUrl!}
          alt={`${channelName} logo`}
          fill
          className="object-cover"
          onError={() => setImageFailed(true)}
          unoptimized
        />
      ) : (
        <span
          className="inline-flex h-full w-full items-center justify-center font-semibold text-white"
          style={{ backgroundImage: getChannelAvatarGradient(channelName) }}
          aria-label={channelName}
        >
          {initials}
        </span>
      )}
    </span>
  );
}

type ChannelTileCardProps = {
  entry: ChannelSummary;
  active: boolean;
  onSelect: (channelKey: string) => void;
  featured?: boolean;
};

function ChannelTileCard({ entry, active, onSelect, featured = false }: ChannelTileCardProps) {
  const isAbj = isAbjChannel(entry.name);
  const newestLabel = formatPublishedLabel(entry.videos[0]?.published_at);
  const accentColor = getChannelAccentColor(entry.name);

  return (
    <button
      type="button"
      onClick={() => onSelect(entry.key)}
      className={`relative min-w-[190px] rounded-xl border text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A00]/60 sm:min-w-0 ${
        active
          ? "border-[#FF6A00]/55 bg-[rgba(255,106,0,0.08)] shadow-[0_8px_20px_rgba(255,106,0,0.12)]"
          : isAbj
            ? "border-[#FF6A00]/30 bg-white hover:border-[#FF6A00]/55 hover:shadow-[0_8px_20px_rgba(255,106,0,0.1)]"
            : "border-[var(--abj-gold-dim)] bg-white hover:border-[rgba(17,17,17,0.28)] hover:shadow-[0_8px_20px_rgba(17,17,17,0.08)]"
      } ${featured ? "p-3.5" : "p-3"}`}
      style={{ boxShadow: active ? undefined : `inset 0 2px 0 0 ${accentColor}22` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <ChannelAvatar channelName={entry.name} logoUrl={entry.logoUrl} size={featured ? "md" : "sm"} />
          <div className="min-w-0">
            <p className={`truncate font-semibold text-abj-text1 ${featured ? "text-[15px]" : "text-sm"}`}>{entry.name}</p>
            <p className="text-[11px] uppercase tracking-[0.08em] text-abj-text2">{entry.videos.length} videí</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <CountryBadge country={entry.country} />
          {isAbj ? (
            <span className="rounded-full bg-[#FF6A00]/14 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#C14900]">
              Hlavní kanál
            </span>
          ) : null}
        </div>
      </div>
      <p className="mt-2 text-[11px] text-abj-text3">{newestLabel ? `Poslední: ${newestLabel}` : "Nově přidáno"}</p>
    </button>
  );
}

type FeaturedAbjSectionProps = {
  primary: FeedVideoView | null;
  secondary: FeedVideoView[];
  loading: boolean;
};

function FeaturedAbjSection({ primary, secondary, loading }: FeaturedAbjSectionProps) {
  if (!primary && !loading) return null;

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-abj-text1">Doporučujeme z ABJ</h2>
        <p className="text-sm text-abj-text2">Rychlý výběr nejčerstvějších pořadů s preferencí hlavního kanálu ABJ.</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <div>
          {primary ? (
            <ArchiveVideoCard
              video={primary}
              variant="hero"
              tag={isAbjChannel(primary.channel) ? "ABJ výběr" : "Hlavní doporučení"}
              accent={isAbjChannel(primary.channel)}
            />
          ) : (
            <VideoCardSkeleton variant="hero" />
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
          {secondary.length > 0
            ? secondary.map((video) => (
                <ArchiveVideoCard
                  key={`featured-${videoUniqKey(video)}`}
                  video={video}
                  variant="featured"
                  accent={isAbjChannel(video.channel)}
                  tag={isAbjChannel(video.channel) ? "ABJ" : undefined}
                />
              ))
            : loading
              ? [0, 1, 2].map((slot) => <VideoCardSkeleton key={`featured-skeleton-${slot}`} variant="featured" />)
              : null}
        </div>
      </div>
    </section>
  );
}

type ChannelTilesProps = {
  channels: ChannelSummary[];
  filteredChannels: ChannelSummary[];
  selectedChannelKey: string | null;
  onSelect: (channelKey: string) => void;
  query: string;
  onQueryChange: (value: string) => void;
  filter: ChannelFilter;
  onFilterChange: (filter: ChannelFilter) => void;
  loading: boolean;
  isExpandingChannels: boolean;
};

function ChannelTiles({
  channels,
  filteredChannels,
  selectedChannelKey,
  onSelect,
  query,
  onQueryChange,
  filter,
  onFilterChange,
  loading,
  isExpandingChannels,
}: ChannelTilesProps) {
  if (channels.length === 0 && !loading) return null;
  const showSearch = channels.length >= 10;
  const showCountryFilters = channels.some((entry) => entry.country === "CZ" || entry.country === "SK");
  const abjPriority = filteredChannels.find((entry) => isAbjChannel(entry.name));
  const topByFreshness = [...filteredChannels]
    .sort((a, b) => b.latestPublishedAt - a.latestPublishedAt)
    .slice(0, 5);
  const spotlightChannels = Array.from(
    new Map(
      [abjPriority, ...topByFreshness]
        .filter((entry): entry is ChannelSummary => Boolean(entry))
        .map((entry) => [entry.key, entry])
    ).values()
  ).slice(0, 4);
  const spotlightKeys = new Set(spotlightChannels.map((entry) => entry.key));
  const remainingChannels = filteredChannels.filter((entry) => !spotlightKeys.has(entry.key));

  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-abj-text1">Kanály</h2>
        <p className="text-sm text-abj-text2">Přehled všech načtených kanálů a rychlý vstup do posledních videí.</p>
      </div>

      {showSearch ? (
        <div className="flex flex-col gap-2 rounded-xl border border-[var(--abj-gold-dim)] bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <input
              type="text"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Hledat kanál..."
              className="w-full rounded-lg border border-[var(--abj-gold-dim)] px-3 py-2 text-sm text-abj-text1 outline-none transition focus:border-[#FF6A00]/65 focus:ring-2 focus:ring-[#FF6A00]/25"
            />
          </div>
          {showCountryFilters ? (
            <div className="flex items-center gap-2">
              {(["ALL", "CZ", "SK"] as const).map((entry) => {
                const active = filter === entry;
                const label = entry === "ALL" ? "Vše" : entry;
                return (
                  <button
                    key={`country-filter-${entry}`}
                    type="button"
                    onClick={() => onFilterChange(entry)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] transition ${
                      active
                        ? "border-[#FF6A00]/55 bg-[rgba(255,106,0,0.1)] text-[#C14900]"
                        : "border-[var(--abj-gold-dim)] bg-white text-abj-text2 hover:text-abj-text1"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.08em] text-abj-text2">
        <span>Zobrazeno {filteredChannels.length}</span>
        <span>Celkem {channels.length} kanálů</span>
      </div>

      {spotlightChannels.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-abj-text2">Doporučené kanály</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {spotlightChannels.map((entry) => (
              <ChannelTileCard
                key={`channel-featured-${entry.key}`}
                entry={entry}
                active={selectedChannelKey === entry.key}
                onSelect={onSelect}
                featured
              />
            ))}
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-abj-text2">Všechny kanály</p>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {(remainingChannels.length > 0 ? remainingChannels : filteredChannels).length > 0
            ? (remainingChannels.length > 0 ? remainingChannels : filteredChannels).map((entry) => (
                <ChannelTileCard
                  key={`channel-grid-${entry.key}`}
                  entry={entry}
                  active={selectedChannelKey === entry.key}
                  onSelect={onSelect}
                />
              ))
            : [0, 1, 2, 3].map((slot) => (
                <div
                  key={`channel-skeleton-${slot}`}
                  className="min-w-[190px] animate-pulse rounded-xl border border-[var(--abj-gold-dim)] bg-white p-3 sm:min-w-0"
                >
                  <div className="mb-2 h-4 w-28 rounded bg-[rgba(17,17,17,0.1)]" />
                  <div className="h-3 w-20 rounded bg-[rgba(17,17,17,0.08)]" />
                </div>
              ))}
        </div>
      </div>

      {isExpandingChannels ? (
        <div className="rounded-xl border border-[rgba(255,106,0,0.24)] bg-[rgba(255,106,0,0.07)] px-3 py-2 text-xs uppercase tracking-[0.08em] text-[#C14900]">
          Načítám další kanály...
        </div>
      ) : null}
      {!loading && filteredChannels.length === 0 ? (
        <div className="rounded-xl border border-[var(--abj-gold-dim)] bg-white p-4 text-sm text-abj-text2">
          Pro zadaný filtr nebyly nalezeny žádné kanály.
        </div>
      ) : null}
    </section>
  );
}

type VideoGridProps = {
  title: string;
  subtitle: string;
  videos: FeedVideoView[];
  loading: boolean;
  emptyMessage: string;
  editorialMode?: boolean;
};

function VideoGrid({ title, subtitle, videos, loading, emptyMessage, editorialMode = false }: VideoGridProps) {
  const heroVideo = videos[0] ?? null;
  const heroThumbnail = readString(heroVideo?.thumbnail) ?? "/placeholder-thumb.jpg";
  const heroDescription = readString(heroVideo?.tldr) ?? subtitle;
  const groupedByDate = useMemo(() => groupVideosByEditorialDate(videos), [videos]);

  return (
    <section className={editorialMode ? "space-y-10" : "space-y-4"}>
      {editorialMode ? (
        <section className="relative overflow-hidden rounded-[34px] border border-[rgba(17,17,17,0.12)] bg-white">
          <div className="relative min-h-[320px] sm:min-h-[380px]">
            <Image
              src={heroThumbnail}
              alt={heroVideo?.title ?? title}
              fill
              priority
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 1200px"
              unoptimized={heroThumbnail.startsWith("http")}
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.12)_0%,rgba(0,0,0,0.65)_70%,rgba(0,0,0,0.88)_100%)]" />
            <div className="relative z-10 flex min-h-[320px] flex-col justify-end gap-4 px-5 pb-8 pt-8 text-white sm:min-h-[380px] sm:px-8 sm:pb-10">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/80">Nejnovější videa</p>
              <h2 className="max-w-4xl font-[var(--font-serif)] text-[clamp(1.8rem,4.4vw,3.3rem)] font-black leading-[1.02]">
                {heroVideo?.title ?? title}
              </h2>
              <p className="max-w-3xl text-sm text-white/88 sm:text-base">{heroDescription}</p>
              <div>
                <a
                  href="#videa-editorial-feed"
                  className="inline-flex min-h-11 items-center rounded-full border border-[#ED742F] bg-[#ED742F] px-5 py-2 text-sm font-semibold uppercase tracking-[0.08em] text-white transition hover:opacity-90"
                >
                  Zjistit více
                </a>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-abj-text1">{title}</h2>
          <p className="text-sm text-abj-text2">{subtitle}</p>
        </div>
      )}

      {videos.length === 0 && !loading ? (
        <div className="rounded-xl border border-[var(--abj-gold-dim)] bg-white p-5 text-sm text-abj-text2">{emptyMessage}</div>
      ) : editorialMode ? (
        <div id="videa-editorial-feed" className="space-y-10">
          {groupedByDate.length > 0
            ? groupedByDate.map((group) => (
                <section key={`group-${group.key}`} className="grid gap-4 md:grid-cols-[92px_minmax(0,1fr)] md:gap-8">
                  <div>
                    <div className="inline-flex min-w-[82px] flex-col items-start border-l border-[rgba(17,17,17,0.16)] pl-3 md:border-l-0 md:pl-0">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-abj-text3">{group.monthLabel}</span>
                      <span className="text-[2.1rem] font-black leading-none text-[#ED742F]">{group.dayLabel}</span>
                      {group.yearLabel ? <span className="text-[11px] text-abj-text3">{group.yearLabel}</span> : null}
                    </div>
                  </div>
                  <div className="grid gap-7 xl:grid-cols-2">
                    {group.videos.map((video) => (
                      <ArchiveVideoCard
                        key={`grid-${group.key}-${videoUniqKey(video)}`}
                        video={video}
                        variant="compact"
                        accent={isAbjChannel(video.channel)}
                        editorial
                      />
                    ))}
                  </div>
                </section>
              ))
            : [0, 1, 2].map((slot) => (
                <section key={`editorial-skeleton-${slot}`} className="grid gap-4 md:grid-cols-[92px_minmax(0,1fr)] md:gap-8">
                  <div>
                    <div className="inline-flex min-w-[82px] flex-col items-start border-l border-[rgba(17,17,17,0.16)] pl-3 md:border-l-0 md:pl-0">
                      <span className="h-3 w-14 animate-pulse rounded bg-[rgba(17,17,17,0.08)]" />
                      <span className="mt-2 h-8 w-10 animate-pulse rounded bg-[rgba(237,116,47,0.28)]" />
                      <span className="mt-2 h-3 w-12 animate-pulse rounded bg-[rgba(17,17,17,0.08)]" />
                    </div>
                  </div>
                  <div className="grid gap-7 xl:grid-cols-2">
                    <VideoCardSkeleton />
                    <VideoCardSkeleton />
                  </div>
                </section>
              ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {videos.length > 0
            ? videos.map((video) => (
                <ArchiveVideoCard key={`grid-${videoUniqKey(video)}`} video={video} variant="compact" accent={isAbjChannel(video.channel)} />
              ))
            : [0, 1, 2, 3, 4, 5, 6, 7].map((slot) => <VideoCardSkeleton key={`grid-skeleton-${slot}`} />)}
        </div>
      )}
    </section>
  );
}

function ChannelVideoPlayer({ video }: { video: FeedVideoView }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const embedUrl = getYoutubeEmbedUrl(video);
  const aspect = getVideoAspectRatio(video);
  const isPortrait = aspect === "portrait";
  const publishedLabel = formatPublishedLabel(video.published_at);

  if (!embedUrl) {
    return (
      <div className="rounded-xl border border-[var(--abj-gold-dim)] bg-white p-4">
        <p className="text-sm text-abj-text2">Video nelze vložit do přehrávače.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        className={`relative overflow-hidden rounded-xl border border-[var(--abj-gold-dim)] bg-black ${
          isPortrait ? "mx-auto aspect-[9/16] w-full max-w-[380px] max-h-[70vh]" : "aspect-video w-full"
        }`}
      >
        {!error ? (
          <iframe
            title={video.title}
            src={embedUrl}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            onLoad={() => setLoading(false)}
            onError={() => {
              setError(true);
              setLoading(false);
            }}
            loading="lazy"
          />
        ) : null}
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/55 text-xs uppercase tracking-[0.08em] text-white/85">
            Načítám přehrávač...
          </div>
        ) : null}
        {error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 p-4 text-center text-sm text-white/90">
            <p>Přehrávač se nepodařilo načíst.</p>
          </div>
        ) : null}
      </div>

      <div className="space-y-1">
        <p className="line-clamp-2 text-sm font-semibold text-abj-text1">{video.title}</p>
        <p className="text-xs text-abj-text2">
          {video.channel}
          {publishedLabel ? ` · ${publishedLabel}` : ""}
        </p>
      </div>
    </div>
  );
}

type ChannelDetailPanelProps = {
  channel: ChannelSummary | null;
  selectedVideo: FeedVideoView | null;
  open: boolean;
  loading: boolean;
  onClose: () => void;
  onSelectVideo: (videoKey: string) => void;
};

function ChannelDetailPanel({ channel, selectedVideo, open, loading, onClose, onSelectVideo }: ChannelDetailPanelProps) {
  if (!open) return null;

  if (!channel) {
    return (
      <section className="rounded-2xl border border-[var(--abj-gold-dim)] bg-white p-5">
        <p className="text-sm text-abj-text2">{loading ? "Načítám data kanálu..." : "Vyberte kanál pro zobrazení detailu."}</p>
      </section>
    );
  }

  const videos = channel.videos.slice(0, CHANNEL_PANEL_VIDEO_LIMIT);
  const activeVideo = selectedVideo ?? videos[0] ?? null;
  const activeVideoKey = activeVideo ? videoUniqKey(activeVideo) : null;

  return (
    <section className="space-y-4 rounded-2xl border border-[var(--abj-gold-dim)] bg-white p-4 sm:p-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ChannelAvatar channelName={channel.name} logoUrl={channel.logoUrl} />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-abj-text1">{channel.name}</h3>
              <CountryBadge country={channel.country} />
            </div>
            <p className="text-xs uppercase tracking-[0.08em] text-abj-text2">{channel.videos.length} načtených videí</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-[var(--abj-gold-dim)] px-3 py-1.5 text-xs uppercase tracking-[0.08em] text-abj-text2 hover:text-abj-text1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A00]/50"
        >
          Zavřít panel
        </button>
      </header>

      {videos.length === 0 ? (
        <div className="rounded-xl border border-[var(--abj-gold-dim)] bg-[rgba(17,17,17,0.03)] p-5 text-sm text-abj-text2">
          Pro tento kanál zatím nejsou dostupná poslední videa.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
          <div>{activeVideo ? <ChannelVideoPlayer key={`channel-player-${videoUniqKey(activeVideo)}`} video={activeVideo} /> : null}</div>
          <div className="space-y-2">
            {videos.map((video) => {
              const key = videoUniqKey(video);
              const active = activeVideoKey === key;
              const publishedLabel = formatPublishedLabel(video.published_at);
              const aspect = getVideoAspectRatio(video);
              const thumbnail = readString(video.thumbnail) ?? "/placeholder-thumb.jpg";
              const canPlay = Boolean(getYoutubeEmbedUrl(video) || getVideoExternalUrl(video));

              return (
                <button
                  key={`channel-video-${key}`}
                  type="button"
                  onClick={() => onSelectVideo(key)}
                  className={`w-full rounded-xl border p-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A00]/55 ${
                    active
                      ? "border-[#FF6A00]/55 bg-[rgba(255,106,0,0.08)]"
                      : "border-[var(--abj-gold-dim)] bg-white hover:border-[rgba(17,17,17,0.26)]"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`relative shrink-0 overflow-hidden rounded-lg bg-[rgba(17,17,17,0.08)] ${
                        aspect === "portrait" ? "h-24 w-[54px]" : "h-16 w-28"
                      }`}
                    >
                      <Image src={thumbnail} alt={video.title} fill className="object-cover" unoptimized={thumbnail.startsWith("http")} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-medium text-abj-text1">{video.title}</p>
                      <p className="mt-1 text-[11px] text-abj-text2">{publishedLabel ?? "Datum neuvedeno"}</p>
                      {video.tldr ? <p className="mt-1 line-clamp-1 text-[11px] text-abj-text3">{video.tldr}</p> : null}
                      {!canPlay ? (
                        <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.08em] text-[#C14900]">Pouze odkaz</p>
                      ) : null}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

export function ArchivClient({ initialData, mode = "default" }: ArchivClientProps) {
  const { posts, loading, hasMore, loadMore } = useFeed();
  const [userSelectedChannelKey, setUserSelectedChannelKey] = useState<string | null>(null);
  const [userSelectedVideoKey, setUserSelectedVideoKey] = useState<string | null>(null);
  const [channelPanelOpen, setChannelPanelOpen] = useState(false);
  const [channelQuery, setChannelQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("ALL");
  const [structuredFeedPayload, setStructuredFeedPayload] = useState<StructuredFeedPayloadView | null>(null);
  const [autoLoadPages, setAutoLoadPages] = useState(0);

  const currentPayload = useMemo<FeedResponseView>(
    () => ({
      top: initialData.topForDisplay,
      channels: Object.fromEntries(initialData.channels.map((entry) => [entry.channel, entry.videos])),
    }),
    [initialData]
  );

  const incomingPayload = useMemo<FeedResponseView>(() => {
    if (posts.length === 0) {
      return { top: [], channels: {} };
    }

    const mapped = posts.map(mapPostToFeedVideo);
    return {
      top: deduplicateVideos(mapped),
      channels: mapped.reduce<Record<string, FeedVideoView[]>>((acc, video) => {
        const key = video.channel || "Neznámý kanál";
        if (!acc[key]) acc[key] = [];
        acc[key].push(video);
        return acc;
      }, {}),
    };
  }, [posts]);

  const supplementalPayload = useMemo(() => mapStructuredFeedPayload(structuredFeedPayload), [structuredFeedPayload]);
  const mergedPayload = useMemo(
    () => mergePayload(mergePayload(currentPayload, incomingPayload), supplementalPayload),
    [currentPayload, incomingPayload, supplementalPayload]
  );

  const allVideos = useMemo(() => {
    const videosFromChannels = Object.values(mergedPayload.channels).flat();
    return sortNewest(deduplicateVideos([...mergedPayload.top, ...videosFromChannels]));
  }, [mergedPayload]);
  const channels = useMemo(() => groupVideosByChannel(allVideos), [allVideos]);
  const hasAnyContent = allVideos.length > 0;
  const isInitialLoading = loading && !hasAnyContent;
  const isExpandingChannels = hasMore && channels.length < CHANNEL_TARGET_COUNT && autoLoadPages < CHANNEL_AUTO_LOAD_MAX_PAGES;

  useEffect(() => {
    let cancelled = false;
    const fetchStructuredFeed = async () => {
      try {
        const response = await fetch("/feed", { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as StructuredFeedPayloadView;
        if (!cancelled) setStructuredFeedPayload(payload);
      } catch {
        // Optional supplemental source; failures are intentionally ignored.
      }
    };
    void fetchStructuredFeed();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hasMore) return;
    if (loading) return;
    if (channels.length >= CHANNEL_TARGET_COUNT) return;
    if (autoLoadPages >= CHANNEL_AUTO_LOAD_MAX_PAGES) return;

    const timer = window.setTimeout(() => {
      setAutoLoadPages((prev) => prev + 1);
      void loadMore();
    }, 180);

    return () => window.clearTimeout(timer);
  }, [autoLoadPages, channels.length, hasMore, loadMore, loading]);

  const featuredSelection = useMemo(() => {
    if (allVideos.length === 0) {
      return { primary: null as FeedVideoView | null, secondary: [] as FeedVideoView[] };
    }

    const abjVideos = allVideos.filter((video) => isAbjChannel(video.channel));
    const primary = abjVideos[0] ?? allVideos[0];
    if (!primary) {
      return { primary: null as FeedVideoView | null, secondary: [] as FeedVideoView[] };
    }

    const seen = new Set<string>([videoUniqKey(primary)]);
    const orderedCandidates = [...abjVideos, ...allVideos];
    const secondary = orderedCandidates.filter((video) => deduplicateBySeen(video, seen)).slice(0, 4);

    return { primary, secondary };
  }, [allVideos]);

  const selectedChannel = useMemo<ChannelSummary | null>(() => {
    if (channels.length === 0) return null;
    if (userSelectedChannelKey) {
      const selected = channels.find((entry) => entry.key === userSelectedChannelKey);
      if (selected) return selected;
    }
    return channels[0];
  }, [channels, userSelectedChannelKey]);

  const latestVideos = useMemo(() => allVideos.slice(0, LATEST_VIDEO_LIMIT), [allVideos]);
  const filteredChannels = useMemo(() => {
    const query = normalizeText(channelQuery);
    return channels.filter((entry) => {
      if (channelFilter !== "ALL" && entry.country !== channelFilter) return false;
      if (!query) return true;
      return normalizeText(entry.name).includes(query);
    });
  }, [channels, channelFilter, channelQuery]);

  const selectedChannelPanelVideos = useMemo(
    () => (selectedChannel ? selectedChannel.videos.slice(0, CHANNEL_PANEL_VIDEO_LIMIT) : []),
    [selectedChannel]
  );
  const selectedChannelPanelVideo = useMemo(() => {
    if (selectedChannelPanelVideos.length === 0) return null;
    if (userSelectedVideoKey) {
      const matched = selectedChannelPanelVideos.find((video) => videoUniqKey(video) === userSelectedVideoKey);
      if (matched) return matched;
    }
    return selectedChannelPanelVideos[0];
  }, [selectedChannelPanelVideos, userSelectedVideoKey]);
  const isVideaMode = mode === "videa";
  const showExtendedOverview = false;

  return (
    <section
      className={`mx-auto w-full px-4 py-6 sm:px-6 ${
        isVideaMode ? "max-w-[1320px] space-y-12 bg-white lg:space-y-14 lg:px-10" : "max-w-[1280px] space-y-10 lg:space-y-12"
      }`}
    >
      <header className={isVideaMode ? "space-y-3" : "space-y-2"}>
        <p
          className={
            isVideaMode
              ? "text-[11px] font-semibold uppercase tracking-[0.18em] text-abj-text3"
              : "text-[11px] uppercase tracking-[0.16em] text-abj-text2"
          }
        >
          Videa
        </p>
        <h1
          className={
            isVideaMode
              ? "font-[var(--font-serif)] text-[clamp(2rem,4.5vw,4rem)] font-black leading-[1.03] text-abj-text1"
              : "font-[var(--font-serif)] text-3xl font-semibold leading-tight text-abj-text1 sm:text-4xl"
          }
        >
          Videa
        </h1>
        <p className={isVideaMode ? "max-w-3xl text-base text-abj-text2 sm:text-lg" : "max-w-3xl text-sm text-abj-text2 sm:text-base"}>
          Průběžně aktualizovaný přehled posledních videí napříč sítí.
        </p>
      </header>

      {showExtendedOverview ? (
        <>
          <FeaturedAbjSection
            primary={featuredSelection.primary}
            secondary={featuredSelection.secondary}
            loading={isInitialLoading}
          />

          <ChannelTiles
            channels={channels}
            filteredChannels={filteredChannels}
            selectedChannelKey={selectedChannel?.key ?? null}
            onSelect={(channelKey) => {
              setUserSelectedChannelKey(channelKey);
              setUserSelectedVideoKey(null);
              setChannelPanelOpen(true);
            }}
            query={channelQuery}
            onQueryChange={setChannelQuery}
            filter={channelFilter}
            onFilterChange={setChannelFilter}
            loading={isInitialLoading}
            isExpandingChannels={isExpandingChannels}
          />

          <ChannelDetailPanel
            channel={selectedChannel}
            selectedVideo={selectedChannelPanelVideo}
            open={channelPanelOpen}
            loading={isInitialLoading}
            onClose={() => setChannelPanelOpen(false)}
            onSelectVideo={setUserSelectedVideoKey}
          />
        </>
      ) : null}

      <VideoGrid
        title="Nejnovější videa"
        subtitle="Průběžně aktualizovaný přehled posledních videí napříč sítí."
        videos={latestVideos}
        loading={isInitialLoading}
        emptyMessage={EMPTY_MESSAGE}
        editorialMode={isVideaMode}
      />

      {hasMore ? (
        <div className="flex justify-center">
          <button
            type="button"
            className={`rounded-full border bg-white px-5 py-2 text-xs font-semibold uppercase tracking-[0.1em] transition focus-visible:outline-none focus-visible:ring-2 ${
              isVideaMode
                ? "border-[#ED742F]/40 text-[#ED742F] hover:border-[#ED742F] hover:bg-[rgba(237,116,47,0.07)] focus-visible:ring-[#ED742F]/45"
                : "border-[var(--abj-gold-dim)] text-abj-text2 hover:border-[#FF6A00]/45 hover:text-abj-text1 focus-visible:ring-[#FF6A00]/60"
            }`}
            onClick={() => {
              void loadMore();
            }}
          >
            {loading ? "Načítám..." : "Načíst další"}
          </button>
        </div>
      ) : null}
    </section>
  );
}

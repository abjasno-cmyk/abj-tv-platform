import "server-only";

import {
  YoutubeTranscript,
  YoutubeTranscriptDisabledError,
  YoutubeTranscriptNotAvailableError,
  YoutubeTranscriptNotAvailableLanguageError,
  YoutubeTranscriptTooManyRequestError,
  YoutubeTranscriptVideoUnavailableError,
  type TranscriptResponse,
} from "youtube-transcript";

import type { VideoTranscriptErrorCode, VideoTranscriptPayload, VideoTranscriptSegment } from "@/lib/videoTranscriptTypes";

const TRANSCRIPT_CACHE_TTL_MS = 30 * 60 * 1000;
const VIDEO_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;
const YOUTUBE_WATCH_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.83 Safari/537.36,gzip(gfe)";
const YOUTUBE_BOT_GUARD_PATTERN =
  /confirm you(?:\u2019|\\u2019|')re not a bot|detected unusual traffic|unusual traffic from your computer network|class="g-recaptcha"/i;

type CachedTranscript = {
  expiresAtMs: number;
  payload: Omit<VideoTranscriptPayload, "fromCache">;
};

type GlobalTranscriptCache = typeof globalThis & {
  __veroxTranscriptCache?: Map<string, CachedTranscript>;
};

type NormalizedTranscriptError = Error & {
  code: VideoTranscriptErrorCode;
  status: number;
};

function getCache(): Map<string, CachedTranscript> {
  const withCache = globalThis as GlobalTranscriptCache;
  if (!withCache.__veroxTranscriptCache) {
    withCache.__veroxTranscriptCache = new Map<string, CachedTranscript>();
  }
  return withCache.__veroxTranscriptCache;
}

function normalizeLanguage(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function normalizeRequestedLanguages(value: string | null): string[] {
  const normalizedInput = normalizeLanguage(value);
  const priorities = [normalizedInput, "cs", "sk", "en", null];
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const candidate of priorities) {
    if (!candidate || seen.has(candidate)) continue;
    seen.add(candidate);
    ordered.push(candidate);
  }
  return ordered;
}

function formatOffsetLabel(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hh = Math.floor(safe / 3600);
  const mm = Math.floor((safe % 3600) / 60);
  const ss = safe % 60;
  if (hh > 0) {
    return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  }
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

function normalizeSegments(rows: TranscriptResponse[]): VideoTranscriptSegment[] {
  return rows
    .map((row) => {
      const text = row.text.trim();
      if (!text) return null;
      const offsetSeconds = Number.isFinite(row.offset) ? Math.max(0, row.offset) : 0;
      const durationSeconds = Number.isFinite(row.duration) ? Math.max(0, row.duration) : 0;
      return {
        text,
        offsetSeconds,
        durationSeconds,
        offsetLabel: formatOffsetLabel(offsetSeconds),
      } satisfies VideoTranscriptSegment;
    })
    .filter((row): row is VideoTranscriptSegment => Boolean(row))
    .sort((a, b) => a.offsetSeconds - b.offsetSeconds);
}

function createTranscriptError(code: VideoTranscriptErrorCode, status: number, message: string): NormalizedTranscriptError {
  const error = new Error(message) as NormalizedTranscriptError;
  error.code = code;
  error.status = status;
  return error;
}

function mapTranscriptFetchError(error: unknown, videoId: string): NormalizedTranscriptError {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    "status" in error &&
    typeof (error as { code?: unknown }).code === "string" &&
    typeof (error as { status?: unknown }).status === "number"
  ) {
    return error as NormalizedTranscriptError;
  }
  if (error instanceof YoutubeTranscriptVideoUnavailableError) {
    return createTranscriptError("video_unavailable", 404, `Video ${videoId} není dostupné.`);
  }
  if (error instanceof YoutubeTranscriptDisabledError) {
    return createTranscriptError("transcript_disabled", 404, `Video ${videoId} nemá dostupný přepis.`);
  }
  if (error instanceof YoutubeTranscriptNotAvailableError) {
    return createTranscriptError("transcript_not_available", 404, `Přepis videa ${videoId} není dostupný.`);
  }
  if (error instanceof YoutubeTranscriptTooManyRequestError) {
    return createTranscriptError("too_many_requests", 429, "YouTube dočasně omezuje načítání přepisu.");
  }
  if (error instanceof YoutubeTranscriptNotAvailableLanguageError) {
    return createTranscriptError("transcript_not_available", 404, "Požadovaný jazyk přepisu není dostupný.");
  }
  if (error instanceof Error) {
    return createTranscriptError("upstream_error", 502, error.message);
  }
  return createTranscriptError("upstream_error", 502, "Nepodařilo se načíst přepis z YouTube.");
}

async function isBlockedByYoutubeBotGuard(videoId: string): Promise<boolean> {
  try {
    const response = await fetch(`https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`, {
      cache: "no-store",
      headers: {
        "User-Agent": YOUTUBE_WATCH_USER_AGENT,
      },
    });
    const html = await response.text();
    return YOUTUBE_BOT_GUARD_PATTERN.test(html);
  } catch {
    return false;
  }
}

function resolveLanguage(rows: TranscriptResponse[], fallback: string | null): string | null {
  const detected = normalizeLanguage(rows[0]?.lang);
  return detected ?? fallback;
}

function resolveVideoId(candidate: string | null): string | null {
  if (!candidate) return null;
  const trimmed = candidate.trim();
  if (!trimmed) return null;
  if (VIDEO_ID_PATTERN.test(trimmed)) return trimmed;

  try {
    const parsed = new URL(trimmed);
    if (parsed.hostname.includes("youtu.be")) {
      const value = parsed.pathname.split("/").filter(Boolean)[0] ?? "";
      return VIDEO_ID_PATTERN.test(value) ? value : null;
    }
    if (parsed.hostname.includes("youtube.com")) {
      const fromQuery = parsed.searchParams.get("v") ?? "";
      if (VIDEO_ID_PATTERN.test(fromQuery)) return fromQuery;
      const parts = parsed.pathname.split("/").filter(Boolean);
      const shortsIndex = parts.findIndex((part) => part === "shorts");
      if (shortsIndex >= 0 && VIDEO_ID_PATTERN.test(parts[shortsIndex + 1] ?? "")) {
        return parts[shortsIndex + 1];
      }
      const embedIndex = parts.findIndex((part) => part === "embed");
      if (embedIndex >= 0 && VIDEO_ID_PATTERN.test(parts[embedIndex + 1] ?? "")) {
        return parts[embedIndex + 1];
      }
    }
  } catch {
    return null;
  }

  return null;
}

export function parseVideoIdOrThrow(candidate: string | null): string {
  const resolved = resolveVideoId(candidate);
  if (!resolved) {
    throw createTranscriptError("invalid_video_id", 400, "Neplatný nebo chybějící videoId.");
  }
  return resolved;
}

async function fetchWithLanguageFallback(videoId: string, requestedLanguage: string | null): Promise<VideoTranscriptPayload> {
  const languageCandidates = normalizeRequestedLanguages(requestedLanguage);
  let lastError: unknown = null;

  for (const language of [...languageCandidates, null]) {
    try {
      const rows = await YoutubeTranscript.fetchTranscript(videoId, language ? { lang: language } : undefined);
      const segments = normalizeSegments(rows);
      if (segments.length === 0) {
        lastError = createTranscriptError("transcript_not_available", 404, "Video obsahuje prázdný přepis.");
        continue;
      }
      const fullText = segments.map((segment) => segment.text).join("\n");
      return {
        videoId,
        language: resolveLanguage(rows, language),
        fetchedAt: new Date().toISOString(),
        fromCache: false,
        fullText,
        segments,
      };
    } catch (error) {
      if (error instanceof YoutubeTranscriptNotAvailableLanguageError) {
        lastError = error;
        continue;
      }
      if (error instanceof YoutubeTranscriptDisabledError) {
        const blockedByBotGuard = await isBlockedByYoutubeBotGuard(videoId);
        if (blockedByBotGuard) {
          throw createTranscriptError("too_many_requests", 429, "YouTube dočasně omezuje načítání přepisu.");
        }
      }
      throw mapTranscriptFetchError(error, videoId);
    }
  }

  throw mapTranscriptFetchError(lastError, videoId);
}

export async function getVideoTranscript(videoId: string, requestedLanguage: string | null): Promise<VideoTranscriptPayload> {
  const cacheKey = `${videoId}::${normalizeLanguage(requestedLanguage) ?? "auto"}`;
  const cache = getCache();
  const now = Date.now();
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAtMs > now) {
    return {
      ...cached.payload,
      fromCache: true,
    };
  }

  const fetched = await fetchWithLanguageFallback(videoId, requestedLanguage);
  const { fromCache: _fromCache, ...cachePayload } = fetched;
  cache.set(cacheKey, {
    expiresAtMs: now + TRANSCRIPT_CACHE_TTL_MS,
    payload: cachePayload,
  });
  return fetched;
}

export function isTranscriptError(value: unknown): value is NormalizedTranscriptError {
  return Boolean(value) && value instanceof Error && "code" in value && "status" in value;
}

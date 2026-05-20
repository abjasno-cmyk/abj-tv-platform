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

type TranscriptFetchOptions = {
  acceptLanguage?: string | null;
};

type FetchTranscriptSegment = {
  text?: unknown;
  start?: unknown;
  duration?: unknown;
};

type FetchTranscriptPayload = {
  language?: unknown;
  segments?: unknown;
  text?: unknown;
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

function normalizeAcceptLanguage(value: string | null | undefined): string {
  const fallback = "cs-CZ,cs;q=0.9,en;q=0.8";
  if (!value) return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function sanitizeEnvValue(value?: string): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const eqIdx = trimmed.indexOf("=");
  const maybeAssigned =
    eqIdx > 0 && /^[A-Z0-9_]+$/i.test(trimmed.slice(0, eqIdx)) ? trimmed.slice(eqIdx + 1).trim() : trimmed;
  if (
    (maybeAssigned.startsWith('"') && maybeAssigned.endsWith('"')) ||
    (maybeAssigned.startsWith("'") && maybeAssigned.endsWith("'"))
  ) {
    return maybeAssigned.slice(1, -1).trim();
  }
  return maybeAssigned;
}

function resolveFetchTranscriptApiKey(): string | null {
  return (
    sanitizeEnvValue(process.env.FETCHTRANSCRIPT_API_KEY) ??
    sanitizeEnvValue(process.env.YOUTUBE_TRANSCRIPT_API_KEY) ??
    null
  );
}

function createYouTubeFetch(acceptLanguage: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(init?.headers ?? {});
    if (!headers.has("Accept-Language")) {
      headers.set("Accept-Language", acceptLanguage);
    }
    return fetch(input, {
      ...init,
      headers,
      redirect: "follow",
    });
  };
}

async function detectRobotChallenge(
  videoId: string,
  fetchFn: typeof fetch,
  acceptLanguage: string
): Promise<void> {
  try {
    const response = await fetchFn(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        "Accept-Language": acceptLanguage,
      },
      cache: "no-store",
    });
    if (!response.ok) return;
    const html = await response.text();
    if (html.includes('class="g-recaptcha"')) {
      throw createTranscriptError("too_many_requests", 429, "YouTube vyžaduje ověření, že nejste robot.");
    }
    const hasBotChallengeText =
      /potvrd[ui]te,\s*ze nejste robot/i.test(html) ||
      /confirm you.?re not a bot/i.test(html) ||
      /Sign in to confirm you.?re not a bot/i.test(html);
    if (hasBotChallengeText) {
      throw createTranscriptError("too_many_requests", 429, "YouTube vyžaduje ověření, že nejste robot.");
    }
  } catch (error) {
    if (isTranscriptError(error)) {
      throw error;
    }
  }
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

function normalizeFetchTranscriptSegments(rows: FetchTranscriptSegment[]): VideoTranscriptSegment[] {
  return rows
    .map((row) => {
      const text = typeof row.text === "string" ? row.text.trim() : "";
      if (!text) return null;
      const offsetSeconds =
        typeof row.start === "number" && Number.isFinite(row.start)
          ? Math.max(0, row.start)
          : typeof row.start === "string" && Number.isFinite(Number(row.start))
            ? Math.max(0, Number(row.start))
            : 0;
      const durationSeconds =
        typeof row.duration === "number" && Number.isFinite(row.duration)
          ? Math.max(0, row.duration)
          : typeof row.duration === "string" && Number.isFinite(Number(row.duration))
            ? Math.max(0, Number(row.duration))
            : 0;
      return {
        text,
        offsetSeconds,
        durationSeconds,
        offsetLabel: formatOffsetLabel(offsetSeconds),
      } satisfies VideoTranscriptSegment;
    })
    .filter((segment): segment is VideoTranscriptSegment => Boolean(segment))
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

async function fetchWithLanguageFallback(
  videoId: string,
  requestedLanguage: string | null,
  options: TranscriptFetchOptions
): Promise<VideoTranscriptPayload> {
  const acceptLanguage = normalizeAcceptLanguage(options.acceptLanguage);
  const fetchFn = createYouTubeFetch(acceptLanguage);
  await detectRobotChallenge(videoId, fetchFn, acceptLanguage);

  const languageCandidates = normalizeRequestedLanguages(requestedLanguage);
  let lastError: unknown = null;

  for (const language of [...languageCandidates, null]) {
    try {
      const rows = await YoutubeTranscript.fetchTranscript(
        videoId,
        language ? { lang: language, fetch: fetchFn } : { fetch: fetchFn }
      );
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
      throw mapTranscriptFetchError(error, videoId);
    }
  }

  throw mapTranscriptFetchError(lastError, videoId);
}

async function fetchFromFetchTranscriptProvider(
  videoId: string,
  requestedLanguage: string | null
): Promise<VideoTranscriptPayload> {
  const apiKey = resolveFetchTranscriptApiKey();
  if (!apiKey) {
    throw createTranscriptError("upstream_error", 502, "Chybí API klíč pro fallback transcript provider.");
  }

  const url = new URL(`https://api.fetchtranscript.com/v1/transcripts/${videoId}`);
  url.searchParams.set("format", "json");
  const normalizedLang = normalizeLanguage(requestedLanguage);
  if (normalizedLang) {
    url.searchParams.set("lang", normalizedLang);
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as FetchTranscriptPayload | null;
  if (!response.ok || !payload) {
    if (response.status === 404) {
      throw createTranscriptError("transcript_not_available", 404, `Přepis videa ${videoId} není dostupný.`);
    }
    if (response.status === 429) {
      throw createTranscriptError("too_many_requests", 429, "Fallback transcript provider je dočasně přetížen.");
    }
    throw createTranscriptError("upstream_error", 502, "Fallback transcript provider vrátil chybu.");
  }

  const rows = Array.isArray(payload.segments) ? (payload.segments as FetchTranscriptSegment[]) : [];
  const segments = normalizeFetchTranscriptSegments(rows);
  if (segments.length === 0) {
    const fullText = typeof payload.text === "string" ? payload.text.trim() : "";
    if (!fullText) {
      throw createTranscriptError("transcript_not_available", 404, `Přepis videa ${videoId} není dostupný.`);
    }
    const syntheticSegment: VideoTranscriptSegment = {
      text: fullText,
      offsetSeconds: 0,
      durationSeconds: 0,
      offsetLabel: "00:00",
    };
    return {
      videoId,
      language: normalizeLanguage(typeof payload.language === "string" ? payload.language : null),
      fetchedAt: new Date().toISOString(),
      fromCache: false,
      fullText,
      segments: [syntheticSegment],
    };
  }

  return {
    videoId,
    language: normalizeLanguage(typeof payload.language === "string" ? payload.language : null),
    fetchedAt: new Date().toISOString(),
    fromCache: false,
    fullText: segments.map((segment) => segment.text).join("\n"),
    segments,
  };
}

export async function getVideoTranscript(
  videoId: string,
  requestedLanguage: string | null,
  options: TranscriptFetchOptions = {}
): Promise<VideoTranscriptPayload> {
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

  let fetched: VideoTranscriptPayload;
  try {
    fetched = await fetchWithLanguageFallback(videoId, requestedLanguage, options);
  } catch (error) {
    const mappedError = mapTranscriptFetchError(error, videoId);
    const canUseFallbackProvider =
      mappedError.code === "too_many_requests" ||
      mappedError.code === "transcript_disabled" ||
      mappedError.code === "transcript_not_available" ||
      mappedError.code === "upstream_error";
    if (!canUseFallbackProvider || !resolveFetchTranscriptApiKey()) {
      throw mappedError;
    }
    fetched = await fetchFromFetchTranscriptProvider(videoId, requestedLanguage);
  }

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

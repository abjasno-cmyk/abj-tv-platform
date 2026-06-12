import "server-only";

import {
  YoutubeTranscript,
  YoutubeTranscriptDisabledError,
  YoutubeTranscriptNotAvailableError,
  YoutubeTranscriptNotAvailableLanguageError,
  YoutubeTranscriptTooManyRequestError,
  YoutubeTranscriptVideoUnavailableError,
} from "youtube-transcript";

import type { TranscriptResponse } from "@/lib/transcriptTypes";

const TRANSCRIPT_CACHE_TTL_MS = 30 * 60 * 1000;

type CachedTranscript = {
  expiresAtMs: number;
  payload: TranscriptResponse;
};

type GlobalTranscriptCache = typeof globalThis & {
  __veroxYoutubeTranscriptCache?: Map<string, CachedTranscript>;
};

function getCache(): Map<string, CachedTranscript> {
  const withCache = globalThis as GlobalTranscriptCache;
  if (!withCache.__veroxYoutubeTranscriptCache) {
    withCache.__veroxYoutubeTranscriptCache = new Map<string, CachedTranscript>();
  }
  return withCache.__veroxYoutubeTranscriptCache;
}

function normalizeLanguage(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function languageCandidates(): Array<string | undefined> {
  const seen = new Set<string>();
  const ordered: Array<string | undefined> = [];
  for (const candidate of ["cs", "sk", "en", undefined]) {
    if (candidate && seen.has(candidate)) continue;
    if (candidate) seen.add(candidate);
    ordered.push(candidate);
  }
  return ordered;
}

async function fetchYoutubeTranscriptText(videoId: string): Promise<string | null> {
  let lastError: unknown = null;

  for (const language of languageCandidates()) {
    try {
      const rows = await YoutubeTranscript.fetchTranscript(videoId, language ? { lang: language } : undefined);
      const text = rows
        .map((row) => row.text.trim())
        .filter(Boolean)
        .join("\n")
        .trim();
      if (text) return text;
      lastError = new YoutubeTranscriptNotAvailableError(videoId);
    } catch (error) {
      if (error instanceof YoutubeTranscriptNotAvailableLanguageError) {
        lastError = error;
        continue;
      }
      if (
        error instanceof YoutubeTranscriptDisabledError ||
        error instanceof YoutubeTranscriptNotAvailableError ||
        error instanceof YoutubeTranscriptVideoUnavailableError ||
        error instanceof YoutubeTranscriptTooManyRequestError
      ) {
        return null;
      }
      lastError = error;
    }
  }

  if (lastError) return null;
  return null;
}

export async function fetchYouTubeTranscriptResponse(videoId: string): Promise<TranscriptResponse | null> {
  const normalized = videoId.trim();
  if (!normalized) return null;

  const cache = getCache();
  const now = Date.now();
  const cached = cache.get(normalized);
  if (cached && cached.expiresAtMs > now) {
    return cached.payload;
  }

  const transcript = await fetchYoutubeTranscriptText(normalized);
  if (!transcript) return null;

  const payload: TranscriptResponse = {
    video_id: normalized,
    status: "ready",
    transcript,
    transcript_at: new Date().toISOString(),
  };

  cache.set(normalized, {
    expiresAtMs: now + TRANSCRIPT_CACHE_TTL_MS,
    payload,
  });

  return payload;
}

export type TranscriptState = "ready" | "pending" | "not_ready_live" | "unavailable";

export type TranscriptStatus = "ready" | "processing" | "not_ready_live" | "unavailable";

export type TranscriptSourceLang = "en" | "cs" | "sk" | null;

export interface TranscriptResponse {
  video_id: string;
  status: TranscriptStatus;
  transcript: string | null;
  transcript_at: string | null;
  transcript_original: string | null;
  source_lang: TranscriptSourceLang;
}

const TRANSCRIPT_STATES: ReadonlySet<string> = new Set([
  "ready",
  "pending",
  "not_ready_live",
  "unavailable",
]);

export function parseTranscriptState(value: unknown): TranscriptState | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim() as TranscriptState;
  return TRANSCRIPT_STATES.has(normalized) ? normalized : undefined;
}

/** Štítek jen podle transcript_state z program feedu. */
export function isTranscriptLabelVisible(state: TranscriptState | undefined | null): boolean {
  return state === "ready" || state === "pending";
}

const TRANSCRIPT_STATUSES: ReadonlySet<string> = new Set([
  "ready",
  "processing",
  "pending",
  "not_ready_live",
  "unavailable",
]);

const TRANSCRIPT_SOURCE_LANGS: ReadonlySet<string> = new Set(["en", "cs", "sk"]);

function normalizeTranscriptStatus(value: string): TranscriptStatus | null {
  const normalized = value.trim();
  if (normalized === "pending") return "processing";
  if (TRANSCRIPT_STATUSES.has(normalized)) {
    return normalized as TranscriptStatus;
  }
  return null;
}

function parseSourceLang(value: unknown): TranscriptSourceLang {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  return TRANSCRIPT_SOURCE_LANGS.has(normalized) ? (normalized as TranscriptSourceLang) : null;
}

export function isTranscriptPending(status: TranscriptStatus | null | undefined): boolean {
  return status === "processing";
}

export function isTranscriptTerminal(status: TranscriptStatus | null | undefined): boolean {
  return status === "ready" || status === "unavailable" || status === "not_ready_live";
}

export function hasTranscriptOriginal(response: TranscriptResponse | null | undefined): boolean {
  return Boolean(response?.transcript_original?.trim());
}

export function resolveDisplayedTranscript(
  response: TranscriptResponse,
  view: "translation" | "original",
): string {
  if (view === "original") {
    return response.transcript_original?.trim() ?? "";
  }
  return response.transcript?.trim() ?? "";
}

export function parseTranscriptResponse(value: unknown): TranscriptResponse | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const videoId = typeof row.video_id === "string" ? row.video_id.trim() : "";
  const statusRaw = typeof row.status === "string" ? row.status.trim() : "";
  const status = normalizeTranscriptStatus(statusRaw);
  if (!videoId || !status) return null;

  return {
    video_id: videoId,
    status,
    transcript: typeof row.transcript === "string" ? row.transcript : row.transcript === null ? null : null,
    transcript_at:
      typeof row.transcript_at === "string"
        ? row.transcript_at
        : row.transcript_at === null
          ? null
          : null,
    transcript_original:
      typeof row.transcript_original === "string"
        ? row.transcript_original
        : row.transcript_original === null
          ? null
          : null,
    source_lang: parseSourceLang(row.source_lang),
  };
}

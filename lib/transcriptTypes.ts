export type TranscriptState = "ready" | "pending" | "not_ready_live" | "unavailable";

export type TranscriptStatus = "ready" | "processing" | "not_ready_live" | "unavailable";

export interface TranscriptResponse {
  video_id: string;
  status: TranscriptStatus;
  transcript: string | null;
  transcript_at: string | null;
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

export function isTranscriptLabelVisible(state: TranscriptState | undefined | null): boolean {
  if (state === "not_ready_live" || state === "unavailable") return false;
  return true;
}

const TRANSCRIPT_STATUSES: ReadonlySet<string> = new Set([
  "ready",
  "processing",
  "pending",
  "not_ready_live",
  "unavailable",
]);

function normalizeTranscriptStatus(value: string): TranscriptStatus | null {
  const normalized = value.trim();
  if (normalized === "pending") return "processing";
  if (TRANSCRIPT_STATUSES.has(normalized)) {
    return normalized as TranscriptStatus;
  }
  return null;
}

export function isTranscriptPending(status: TranscriptStatus | null | undefined): boolean {
  return status === "processing";
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
  };
}

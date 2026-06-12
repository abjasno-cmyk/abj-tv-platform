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
  return state === "ready" || state === "pending";
}

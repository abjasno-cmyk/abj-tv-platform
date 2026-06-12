import { parseTranscriptResponse, type TranscriptResponse } from "@/lib/transcriptTypes";

export const TRANSCRIPT_POLL_INTERVAL_MS = 3000;
/** Po tomto čase zobrazíme „trvá déle“, ale polling pokračuje. */
export const TRANSCRIPT_POLL_SOFT_TIMEOUT_MS = 120_000;
/** Tvrdý strop — poté nabídneme ruční opakování. */
export const TRANSCRIPT_POLL_HARD_TIMEOUT_MS = 600_000;

export async function fetchVideoTranscript(videoId: string): Promise<TranscriptResponse | null> {
  const normalized = videoId.trim();
  if (!normalized) return null;

  try {
    const res = await fetch(`/api/transcript/${encodeURIComponent(normalized)}`, {
      cache: "no-store",
    });
    const text = await res.text();
    if (!text.trim()) return null;

    let payload: unknown;
    try {
      payload = JSON.parse(text);
    } catch {
      return null;
    }

    const parsed = parseTranscriptResponse(payload);
    if (parsed) return parsed;

    // Upstream/proxy error envelope without transcript shape.
    return null;
  } catch {
    return null;
  }
}

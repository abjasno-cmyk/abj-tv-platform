import type { TranscriptResponse } from "@/lib/transcriptTypes";

const PROXY_BASE = "/api/replit";

export const TRANSCRIPT_POLL_INTERVAL_MS = 3000;
export const TRANSCRIPT_POLL_TIMEOUT_MS = 120_000;

export async function fetchVideoTranscript(videoId: string): Promise<TranscriptResponse | null> {
  const normalized = videoId.trim();
  if (!normalized) return null;

  try {
    const res = await fetch(`${PROXY_BASE}/transcript/${encodeURIComponent(normalized)}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as TranscriptResponse;
  } catch {
    return null;
  }
}

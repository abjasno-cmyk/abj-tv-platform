import "server-only";

import { unstable_cache } from "next/cache";

import { fetchVideoTranscriptServer } from "@/lib/transcriptFetchServer";
import type { TranscriptResponse } from "@/lib/transcriptTypes";

const TRANSCRIPT_FETCH_TIMEOUT_MS = 4_000;

async function fetchTranscriptWithTimeout(videoId: string): Promise<TranscriptResponse | null> {
  return Promise.race([
    fetchVideoTranscriptServer(videoId),
    new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), TRANSCRIPT_FETCH_TIMEOUT_MS);
    }),
  ]);
}

export async function loadCachedVideoTranscript(videoId: string): Promise<TranscriptResponse | null> {
  const normalized = videoId.trim();
  if (!normalized) return null;

  const cached = unstable_cache(
    async () => fetchTranscriptWithTimeout(normalized),
    [`seo-transcript-${normalized}`],
    {
      revalidate: 3600,
      tags: [`transcript:${normalized}`],
    },
  );

  return cached();
}

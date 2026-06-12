import "server-only";

import { unstable_cache } from "next/cache";

import {
  buildTranscriptUrlCandidates,
  fetchFirstUpstream,
  resolveFeedApiKey,
} from "@/lib/programFeedProxy";
import { parseTranscriptResponse, type TranscriptResponse } from "@/lib/transcriptTypes";

const TRANSCRIPT_FETCH_TIMEOUT_MS = 4_000;

async function fetchTranscriptUpstream(videoId: string): Promise<TranscriptResponse | null> {
  const apiKey = resolveFeedApiKey();
  if (!apiKey) return null;

  const candidateUrls = buildTranscriptUrlCandidates(videoId);
  const request = new Request(`https://verox.cz/api/transcript/${encodeURIComponent(videoId)}`);
  const { response } = await fetchFirstUpstream(candidateUrls, request, apiKey);
  if (!response || !response.ok) return null;

  try {
    const payload = (await response.json()) as unknown;
    return parseTranscriptResponse(payload);
  } catch {
    return null;
  }
}

async function fetchTranscriptWithTimeout(videoId: string): Promise<TranscriptResponse | null> {
  return Promise.race([
    fetchTranscriptUpstream(videoId),
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

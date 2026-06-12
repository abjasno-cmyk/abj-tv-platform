import "server-only";

import {
  buildTranscriptUrlCandidates,
  fetchFirstUpstream,
  resolveFeedApiKey,
} from "@/lib/programFeedProxy";
import { fetchYouTubeTranscriptResponse } from "@/lib/transcriptYouTubeFallback";
import { isTranscriptPending, parseTranscriptResponse, type TranscriptResponse } from "@/lib/transcriptTypes";

function shouldUseUpstreamResponse(payload: TranscriptResponse): boolean {
  if (payload.status === "not_ready_live" || isTranscriptPending(payload.status)) {
    return true;
  }
  if (payload.status === "ready" && payload.transcript?.trim()) {
    return true;
  }
  return false;
}

async function fetchReplitTranscript(videoId: string, request: Request): Promise<TranscriptResponse | null> {
  const apiKey = resolveFeedApiKey();
  if (!apiKey) return null;

  const candidateUrls = buildTranscriptUrlCandidates(videoId);
  const { response: upstreamResponse } = await fetchFirstUpstream(candidateUrls, request, apiKey);
  if (!upstreamResponse?.ok) return null;

  try {
    const payload = (await upstreamResponse.json()) as unknown;
    return parseTranscriptResponse(payload);
  } catch {
    return null;
  }
}

export async function fetchVideoTranscriptServer(
  videoId: string,
  request = new Request(`https://verox.cz/api/transcript/${encodeURIComponent(videoId)}`),
): Promise<TranscriptResponse | null> {
  const normalized = videoId.trim();
  if (!normalized) return null;

  const upstream = await fetchReplitTranscript(normalized, request);
  if (upstream && shouldUseUpstreamResponse(upstream)) {
    return upstream;
  }

  const youtube = await fetchYouTubeTranscriptResponse(normalized);
  if (youtube) return youtube;

  return upstream;
}

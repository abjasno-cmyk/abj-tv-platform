import {
  buildTranscriptUrlCandidates,
  fetchFirstUpstream,
  resolveFeedApiKey,
} from "@/lib/programFeedProxy";
import { isValidYouTubeVideoId } from "@/lib/viewer/videoPageServer";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ videoId: string }> | { videoId: string };
};

async function resolveVideoId(context: RouteContext): Promise<string | null> {
  const resolved = await Promise.resolve(context.params);
  const raw = resolved.videoId?.trim();
  if (!raw || !isValidYouTubeVideoId(raw)) return null;
  return raw;
}

export async function GET(request: Request, context: RouteContext) {
  const videoId = await resolveVideoId(context);
  if (!videoId) {
    return Response.json({ error: "Invalid video id." }, { status: 400 });
  }

  const apiKey = resolveFeedApiKey();
  if (!apiKey) {
    return Response.json(
      {
        error: "Missing API key. Configure FEED_API_KEY, PROGRAM_FEED_API_KEY, or REPLIT_API_KEY.",
      },
      { status: 500 },
    );
  }

  const candidateUrls = buildTranscriptUrlCandidates(videoId);
  const { response: upstreamResponse, resolvedUrl, upstreamAttempts, lastNetworkError } =
    await fetchFirstUpstream(candidateUrls, request, apiKey);

  if (!upstreamResponse) {
    if (lastNetworkError) {
      console.error("transcript-feed-proxy-network-error", { videoId, lastNetworkError });
      return Response.json({ error: "Failed to fetch upstream transcript." }, { status: 502 });
    }
    return Response.json(
      {
        error: "Transcript endpoint not found. Check PROGRAM_FEED_URL and feed API deployment.",
        video_id: videoId,
        status: "unavailable",
        transcript: null,
        transcript_at: null,
      },
      { status: 502 },
    );
  }

  const body = await upstreamResponse.text();
  const headers = new Headers({
    "Content-Type": upstreamResponse.headers.get("content-type") ?? "application/json; charset=utf-8",
    "Cache-Control": "no-store, max-age=0",
  });
  if (process.env.NODE_ENV !== "production") {
    headers.set("X-Transcript-Upstream", resolvedUrl);
    if (upstreamAttempts.length > 0) {
      headers.set("X-Transcript-Upstream-Trace", upstreamAttempts.join(" | "));
    }
  }

  return new Response(body, {
    status: upstreamResponse.status,
    headers,
  });
}

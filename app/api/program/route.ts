import {
  buildProgramFeedCandidates,
  fetchFirstUpstream,
  resolveFeedApiKey,
  resolveProgramFeedUrl,
} from "@/lib/programFeedProxy";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const apiKey = resolveFeedApiKey();
  if (!apiKey) {
    return Response.json(
      {
        error:
          "Missing API key. Configure FEED_API_KEY, PROGRAM_FEED_API_KEY, or REPLIT_API_KEY.",
      },
      { status: 500 },
    );
  }

  const candidateUrls = buildProgramFeedCandidates(resolveProgramFeedUrl());
  const { response: upstreamResponse, resolvedUrl, upstreamAttempts, lastNetworkError } =
    await fetchFirstUpstream(candidateUrls, request, apiKey);

  if (!upstreamResponse) {
    if (lastNetworkError) {
      console.error("program-feed-proxy-network-error", lastNetworkError);
      return Response.json({ error: "Failed to fetch upstream program feed." }, { status: 502 });
    }
    return Response.json(
      {
        error:
          "Program feed endpoint not found. Check PROGRAM_FEED_URL or keep it empty to use the default attached-assets feed.",
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
    headers.set("X-Program-Upstream", resolvedUrl);
    if (upstreamAttempts.length > 0) {
      headers.set("X-Program-Upstream-Trace", upstreamAttempts.join(" | "));
    }
  }
  return new Response(body, {
    status: upstreamResponse.status,
    headers,
  });
}

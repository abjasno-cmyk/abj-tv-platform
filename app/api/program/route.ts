import { resolveProgramFeedUrlCandidates, resolveReplitApiKey } from "@/lib/replitConfig";

export const dynamic = "force-dynamic";

function withForwardedQuery(baseUrl: string, incomingRequest: Request): URL {
  const upstreamUrl = new URL(baseUrl);
  const incoming = new URL(incomingRequest.url);
  incoming.searchParams.forEach((value, key) => {
    upstreamUrl.searchParams.append(key, value);
  });
  return upstreamUrl;
}

export async function GET(request: Request) {
  const apiKey = resolveReplitApiKey();
  if (!apiKey) {
    return Response.json(
      {
        error:
          "Missing API key. Configure FEED_API_KEY, PROGRAM_FEED_API_KEY, or REPLIT_API_KEY.",
      },
      { status: 500 },
    );
  }

  const candidateUrls = resolveProgramFeedUrlCandidates();
  let upstreamResponse: Response | null = null;
  let resolvedUrl = "";
  let lastNetworkError: unknown = null;
  const upstreamAttempts: string[] = [];

  for (const candidate of candidateUrls) {
    const upstreamUrl = withForwardedQuery(candidate, request);
    try {
      const response = await fetch(upstreamUrl, {
        headers: {
          Accept: "application/json",
          "X-Api-Key": apiKey,
        },
        cache: "no-store",
        next: { revalidate: 0 },
      });

      if (response.status === 404) {
        upstreamAttempts.push(`${upstreamUrl.toString()} => 404`);
        continue;
      }

      upstreamAttempts.push(`${upstreamUrl.toString()} => ${response.status}`);
      upstreamResponse = response;
      resolvedUrl = upstreamUrl.toString();
      break;
    } catch (error) {
      lastNetworkError = error;
      upstreamAttempts.push(`${upstreamUrl.toString()} => network-error`);
    }
  }

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

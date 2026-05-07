export const dynamic = "force-dynamic";

const DEFAULT_PROGRAM_FEED_URL = "https://attached-assets-abjasno.replit.app/program";

function sanitizeEnvValue(value?: string): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  const equalsIdx = trimmed.indexOf("=");
  const maybeAssigned =
    equalsIdx > 0 && /^[A-Z0-9_]+$/.test(trimmed.slice(0, equalsIdx))
      ? trimmed.slice(equalsIdx + 1).trim()
      : trimmed;

  if (
    (maybeAssigned.startsWith('"') && maybeAssigned.endsWith('"')) ||
    (maybeAssigned.startsWith("'") && maybeAssigned.endsWith("'"))
  ) {
    return maybeAssigned.slice(1, -1).trim();
  }
  return maybeAssigned;
}

function resolveProgramFeedUrl(): string {
  return sanitizeEnvValue(process.env.PROGRAM_FEED_URL) ?? DEFAULT_PROGRAM_FEED_URL;
}

function resolveFeedApiKey(): string | null {
  const candidates = [
    process.env.FEED_API_KEY,
    process.env.PROGRAM_FEED_API_KEY,
    process.env.REPLIT_API_KEY,
    process.env.PROGRAM_API_KEY,
    process.env.API_KEY,
  ];
  for (const candidate of candidates) {
    const resolved = sanitizeEnvValue(candidate);
    if (resolved) return resolved;
  }
  return null;
}

function addCandidate(candidates: string[], seen: Set<string>, candidate: string) {
  const normalized = candidate.trim();
  if (!normalized || seen.has(normalized)) return;
  seen.add(normalized);
  candidates.push(normalized);
}

function buildProgramFeedCandidates(configuredFeedUrl: string): string[] {
  const candidates: string[] = [];
  const seen = new Set<string>();
  addCandidate(candidates, seen, configuredFeedUrl);

  try {
    const configured = new URL(configuredFeedUrl);
    const path = configured.pathname.replace(/\/+$/, "");
    if (path !== "/program") {
      configured.pathname = `${path}/program`;
      configured.search = "";
      configured.hash = "";
      addCandidate(candidates, seen, configured.toString());
    }
  } catch {
    // Keep original candidate only.
  }

  addCandidate(candidates, seen, DEFAULT_PROGRAM_FEED_URL);
  return candidates;
}

function withForwardedQuery(baseUrl: string, incomingRequest: Request): URL {
  const upstreamUrl = new URL(baseUrl);
  const incoming = new URL(incomingRequest.url);
  incoming.searchParams.forEach((value, key) => {
    upstreamUrl.searchParams.append(key, value);
  });
  return upstreamUrl;
}

export async function GET(request: Request) {
  const apiKey = resolveFeedApiKey();
  if (!apiKey) {
    return Response.json(
      {
        error:
          "Missing API key. Configure FEED_API_KEY, PROGRAM_FEED_API_KEY, or REPLIT_API_KEY in environment variables.",
      },
      { status: 500 },
    );
  }

  const candidateUrls = buildProgramFeedCandidates(resolveProgramFeedUrl());
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

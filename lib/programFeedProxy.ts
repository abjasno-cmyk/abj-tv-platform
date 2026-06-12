import "server-only";

const DEFAULT_PROGRAM_FEED_URL = "https://attached-assets-abjasno.replit.app/program";
const DEFAULT_REPLIT_BASE_URL = "https://attached-assets-abjasno.replit.app";

export function sanitizeEnvValue(value?: string): string | undefined {
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

export function resolveProgramFeedUrl(): string {
  return sanitizeEnvValue(process.env.PROGRAM_FEED_URL) ?? DEFAULT_PROGRAM_FEED_URL;
}

export function resolveFeedApiKey(): string | null {
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

export function buildProgramFeedCandidates(configuredFeedUrl: string): string[] {
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

function transcriptUrlFromFeedUrl(feedUrl: string, videoId: string): string | null {
  try {
    const url = new URL(feedUrl);
    const path = url.pathname.replace(/\/+$/, "");
    if (path.endsWith("/program")) {
      url.pathname = `${path.slice(0, -"/program".length)}/transcript/${encodeURIComponent(videoId)}`;
    } else {
      url.pathname = `/transcript/${encodeURIComponent(videoId)}`;
    }
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function transcriptUrlFromBase(baseUrl: string, videoId: string): string | null {
  try {
    const url = new URL(baseUrl);
    url.pathname = `/transcript/${encodeURIComponent(videoId)}`;
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

export function buildTranscriptUrlCandidates(videoId: string): string[] {
  const normalizedVideoId = videoId.trim();
  const candidates: string[] = [];
  const seen = new Set<string>();

  for (const feedCandidate of buildProgramFeedCandidates(resolveProgramFeedUrl())) {
    const transcriptUrl = transcriptUrlFromFeedUrl(feedCandidate, normalizedVideoId);
    if (transcriptUrl) addCandidate(candidates, seen, transcriptUrl);
  }

  const replitBase =
    sanitizeEnvValue(process.env.NEXT_PUBLIC_REPLIT_URL) ?? sanitizeEnvValue(process.env.REPLIT_URL);
  const replitTranscript = replitBase ? transcriptUrlFromBase(replitBase, normalizedVideoId) : null;
  if (replitTranscript) addCandidate(candidates, seen, replitTranscript);

  const defaultTranscript = transcriptUrlFromBase(DEFAULT_REPLIT_BASE_URL, normalizedVideoId);
  if (defaultTranscript) addCandidate(candidates, seen, defaultTranscript);

  return candidates;
}

export function withForwardedQuery(baseUrl: string, incomingRequest: Request): URL {
  const upstreamUrl = new URL(baseUrl);
  const incoming = new URL(incomingRequest.url);
  incoming.searchParams.forEach((value, key) => {
    upstreamUrl.searchParams.append(key, value);
  });
  return upstreamUrl;
}

export async function fetchFirstUpstream(
  candidateUrls: string[],
  request: Request,
  apiKey: string,
): Promise<{
  response: Response | null;
  resolvedUrl: string;
  upstreamAttempts: string[];
  lastNetworkError: unknown;
}> {
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

  return { response: upstreamResponse, resolvedUrl, upstreamAttempts, lastNetworkError };
}

function isDeploymentNotLivePage(body: string, contentType: string): boolean {
  if (contentType.toLowerCase().includes("text/html")) return true;
  const trimmed = body.trimStart();
  return trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html");
}

function jsonResponse(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

/**
 * Transcript upstream: 404 from a live host means "video not in DB", not "wrong URL".
 * Only skip to the next host when the response is a Replit deployment placeholder (HTML).
 */
export async function fetchTranscriptUpstream(
  candidateUrls: string[],
  request: Request,
  apiKey: string,
  videoId: string,
): Promise<{
  response: Response | null;
  resolvedUrl: string;
  upstreamAttempts: string[];
  lastNetworkError: unknown;
}> {
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

      const contentType = response.headers.get("content-type") ?? "";
      const bodyText = await response.text();
      upstreamAttempts.push(`${upstreamUrl.toString()} => ${response.status}`);

      if (response.status === 404) {
        if (isDeploymentNotLivePage(bodyText, contentType)) {
          continue;
        }

        if (bodyText.trim()) {
          try {
            const payload = JSON.parse(bodyText) as unknown;
            if (payload && typeof payload === "object") {
              return {
                response: jsonResponse(bodyText, 200),
                resolvedUrl: upstreamUrl.toString(),
                upstreamAttempts,
                lastNetworkError: null,
              };
            }
          } catch {
            // Fall through to unavailable envelope.
          }
        }

        return {
          response: jsonResponse(
            JSON.stringify({
              video_id: videoId,
              status: "unavailable",
              transcript: null,
              transcript_at: null,
              transcript_original: null,
              source_lang: null,
            }),
          ),
          resolvedUrl: upstreamUrl.toString(),
          upstreamAttempts,
          lastNetworkError: null,
        };
      }

      return {
        response: new Response(bodyText, {
          status: response.status,
          headers: {
            "Content-Type": contentType || "application/json; charset=utf-8",
          },
        }),
        resolvedUrl: upstreamUrl.toString(),
        upstreamAttempts,
        lastNetworkError: null,
      };
    } catch (error) {
      lastNetworkError = error;
      upstreamAttempts.push(`${upstreamUrl.toString()} => network-error`);
    }
  }

  return { response: null, resolvedUrl: "", upstreamAttempts, lastNetworkError };
}

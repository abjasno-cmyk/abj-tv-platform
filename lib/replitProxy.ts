import "server-only";

const DEFAULT_REPLIT_BASE_URL = "https://attached-assets-abjasno.replit.app";

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

export function resolveReplitBaseUrl(): string | null {
  return sanitizeEnvValue(process.env.NEXT_PUBLIC_REPLIT_URL) ?? sanitizeEnvValue(process.env.REPLIT_URL) ?? null;
}

function resolveApiKey(): string | null {
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

function buildBaseCandidates(): string[] {
  const configured = resolveReplitBaseUrl();
  const candidates = [configured, DEFAULT_REPLIT_BASE_URL]
    .filter((value): value is string => Boolean(value && value.trim().length > 0))
    .map((value) => value.trim());

  return Array.from(new Set(candidates));
}

function makeUpstreamUrl(baseUrl: string, upstreamPath: string, request: Request): URL {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const normalizedPath = upstreamPath.startsWith("/") ? upstreamPath : `/${upstreamPath}`;
  const upstreamUrl = new URL(`${normalizedBase}${normalizedPath}`);
  const incoming = new URL(request.url);
  incoming.searchParams.forEach((value, key) => {
    upstreamUrl.searchParams.append(key, value);
  });
  return upstreamUrl;
}

async function proxyReplitRequest(request: Request, upstreamPath: string, method: "GET" | "POST"): Promise<Response> {
  const baseCandidates = buildBaseCandidates();
  if (baseCandidates.length === 0) {
    return Response.json(
      {
        error: "Missing NEXT_PUBLIC_REPLIT_URL/REPLIT_URL in environment.",
      },
      { status: 500 },
    );
  }

  const apiKey = resolveApiKey();
  const contentType = request.headers.get("content-type");
  const body = method === "POST" ? await request.text() : undefined;
  const attempts: string[] = [];

  for (const base of baseCandidates) {
    const upstreamUrl = makeUpstreamUrl(base, upstreamPath, request);
    try {
      const upstream = await fetch(upstreamUrl, {
        method,
        headers: {
          Accept: "application/json",
          ...(contentType ? { "Content-Type": contentType } : {}),
          ...(apiKey ? { "X-Api-Key": apiKey } : {}),
        },
        body: method === "POST" ? body : undefined,
        cache: "no-store",
        next: { revalidate: 0 },
      });
      const payload = await upstream.text();
      attempts.push(`${upstreamUrl.toString()} => ${upstream.status}`);
      if (upstream.status === 404) {
        continue;
      }
      const headers = new Headers({
        "Content-Type": upstream.headers.get("content-type") ?? "application/json; charset=utf-8",
        "Cache-Control": "no-store, max-age=0",
      });
      if (process.env.NODE_ENV !== "production") {
        headers.set("X-Replit-Upstream", upstreamUrl.toString());
        headers.set("X-Replit-Upstream-Trace", attempts.join(" | "));
      }
      return new Response(payload, {
        status: upstream.status,
        headers,
      });
    } catch (error) {
      attempts.push(`${upstreamUrl.toString()} => network-error`);
      console.error("replit-proxy-request-failed", { upstream: upstreamUrl.toString(), method, error });
    }
  }

  return Response.json(
    {
      error: "Replit upstream request failed.",
      attempts,
    },
    { status: 502 },
  );
}

export async function proxyReplitGet(request: Request, upstreamPath: string): Promise<Response> {
  return proxyReplitRequest(request, upstreamPath, "GET");
}

export async function proxyReplitPost(request: Request, upstreamPath: string): Promise<Response> {
  return proxyReplitRequest(request, upstreamPath, "POST");
}

export function getReplitProxyBasePath(): string {
  return "/api/replit";
}

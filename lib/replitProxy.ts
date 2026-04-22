import "server-only";

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
  const baseUrl = resolveReplitBaseUrl();
  if (!baseUrl) {
    return Response.json(
      {
        error: "Missing NEXT_PUBLIC_REPLIT_URL/REPLIT_URL in environment.",
      },
      { status: 500 },
    );
  }

  const upstreamUrl = makeUpstreamUrl(baseUrl, upstreamPath, request);
  const contentType = request.headers.get("content-type");
  const body = method === "POST" ? await request.text() : undefined;

  try {
    const upstream = await fetch(upstreamUrl, {
      method,
      headers: {
        Accept: "application/json",
        ...(contentType ? { "Content-Type": contentType } : {}),
      },
      body: method === "POST" ? body : undefined,
      cache: "no-store",
      next: { revalidate: 0 },
    });
    const payload = await upstream.text();
    return new Response(payload, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("content-type") ?? "application/json; charset=utf-8",
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("replit-proxy-request-failed", { upstream: upstreamUrl.toString(), method, error });
    return Response.json({ error: "Replit upstream request failed." }, { status: 502 });
  }
}

export async function proxyReplitGet(request: Request, upstreamPath: string): Promise<Response> {
  return proxyReplitRequest(request, upstreamPath, "GET");
}

export async function proxyReplitPost(request: Request, upstreamPath: string): Promise<Response> {
  return proxyReplitRequest(request, upstreamPath, "POST");
}

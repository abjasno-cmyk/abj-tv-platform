import "server-only";

import { resolveReplitApiKey, resolveReplitBaseUrlCandidates } from "@/lib/replitConfig";

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
  const baseCandidates = resolveReplitBaseUrlCandidates();
  if (baseCandidates.length === 0) {
    return Response.json(
      {
        error: "Missing Replit base URL environment configuration.",
      },
      { status: 500 },
    );
  }

  const apiKey = resolveReplitApiKey();
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

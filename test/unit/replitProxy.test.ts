import { describe, it, expect, beforeEach, vi } from "vitest";
import { proxyReplitGet, proxyReplitPost, resolveReplitBaseUrl } from "@/lib/replitProxy";

const BASE = "https://attached-assets-abjasno.replit.app";

function mockFetchOnce(status: number, body: string, contentType = "application/json") {
  return vi.fn(async () =>
    new Response(body, { status, headers: { "content-type": contentType } }),
  );
}

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("NEXT_PUBLIC_REPLIT_URL", BASE);
  vi.stubEnv("FEED_API_KEY", "secret-key");
});

describe("resolveReplitBaseUrl", () => {
  it("reads and sanitizes the configured base url", () => {
    vi.stubEnv("NEXT_PUBLIC_REPLIT_URL", '  "https://configured.replit.app"  ');
    expect(resolveReplitBaseUrl()).toBe("https://configured.replit.app");
  });
});

describe("replit proxy path allowlist", () => {
  it("rejects a path not on the allowlist with 404 (no upstream call)", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const res = await proxyReplitGet(new Request("https://x.test/api/replit/secret"), "/secret");
    expect(res.status).toBe(404);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it.each(["/health", "/program", "/program/now", "/feed", "/videos", "/context/abc123"])(
    "allows allowlisted path %s",
    async (path) => {
      const fetchSpy = mockFetchOnce(200, JSON.stringify({ ok: true }));
      vi.stubGlobal("fetch", fetchSpy);
      const res = await proxyReplitGet(new Request("https://x.test/api/replit" + path), path);
      expect(res.status).toBe(200);
      expect(fetchSpy).toHaveBeenCalledOnce();
    },
  );
});

describe("replit proxy request behavior", () => {
  it("forwards the upstream status and body for an allowed GET", async () => {
    const fetchSpy = mockFetchOnce(200, JSON.stringify({ program: [] }));
    vi.stubGlobal("fetch", fetchSpy);
    const res = await proxyReplitGet(new Request("https://x.test/api/replit/program"), "/program");
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ program: [] });
  });

  it("attaches the X-Api-Key header and forwards query params", async () => {
    const fetchSpy = mockFetchOnce(200, "{}");
    vi.stubGlobal("fetch", fetchSpy);
    await proxyReplitGet(new Request("https://x.test/api/replit/feed?limit=5"), "/feed");
    const [calledUrl, init] = fetchSpy.mock.calls[0];
    expect(String(calledUrl)).toBe(`${BASE}/feed?limit=5`);
    expect((init as RequestInit).method).toBe("GET");
    expect((init as RequestInit).headers).toMatchObject({ "X-Api-Key": "secret-key" });
  });

  it("forwards the POST body and content-type", async () => {
    const fetchSpy = mockFetchOnce(201, JSON.stringify({ liked: true }));
    vi.stubGlobal("fetch", fetchSpy);
    const req = new Request("https://x.test/api/replit/feed/abc/like", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ x: 1 }),
    });
    const res = await proxyReplitPost(req, "/feed/abc/like");
    expect(res.status).toBe(201);
    const [, init] = fetchSpy.mock.calls[0];
    expect((init as RequestInit).method).toBe("POST");
    expect((init as RequestInit).body).toBe(JSON.stringify({ x: 1 }));
  });

  it("falls back to the hardcoded default base when no env url is configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_REPLIT_URL", "");
    vi.stubEnv("REPLIT_URL", "");
    // The lib always includes a hardcoded default base candidate, so the
    // request is still attempted against attached-assets-abjasno.replit.app.
    const fetchSpy = mockFetchOnce(200, "{}");
    vi.stubGlobal("fetch", fetchSpy);
    const res = await proxyReplitGet(new Request("https://x.test/api/replit/health"), "/health");
    expect(res.status).toBe(200);
    expect(String(fetchSpy.mock.calls[0][0])).toContain("attached-assets-abjasno.replit.app");
  });

  it("returns 502 when every upstream candidate throws", async () => {
    const fetchSpy = vi.fn(async () => {
      throw new Error("network down");
    });
    vi.stubGlobal("fetch", fetchSpy);
    const res = await proxyReplitGet(new Request("https://x.test/api/replit/health"), "/health");
    expect(res.status).toBe(502);
    const payload = (await res.json()) as { error: string; attempts: string[] };
    expect(payload.error).toMatch(/failed/i);
    expect(Array.isArray(payload.attempts)).toBe(true);
  });

  it("falls through to the next base candidate on a 404", async () => {
    // Configured base 404s, hardcoded default returns 200 → proxy should keep
    // the 200 from the second candidate.
    vi.stubEnv("NEXT_PUBLIC_REPLIT_URL", "https://primary.replit.app");
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(new Response("not found", { status: 404 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchSpy);
    const res = await proxyReplitGet(new Request("https://x.test/api/replit/health"), "/health");
    expect(res.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});

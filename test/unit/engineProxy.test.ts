import { describe, it, expect, beforeEach, vi } from "vitest";
import { proxyEngineGet, proxyEnginePost, resolveEngineBaseUrl } from "@/lib/engineProxy";

const BASE = "https://attached-assets-abjasno.replit.app";

function mockFetchOnce(status: number, body: string, contentType = "application/json") {
  return vi.fn(async (..._args: [input: RequestInfo | URL, init?: RequestInit]) =>
    new Response(body, { status, headers: { "content-type": contentType } }),
  );
}

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("NEXT_PUBLIC_REPLIT_URL", BASE);
  vi.stubEnv("FEED_API_KEY", "secret-key");
});

describe("resolveEngineBaseUrl", () => {
  it("reads and sanitizes the configured base url", () => {
    vi.stubEnv("NEXT_PUBLIC_ENGINE_URL", '  "https://engine.test"  ');
    expect(resolveEngineBaseUrl()).toBe("https://engine.test");
  });
});

describe("engine proxy path allowlist", () => {
  it("rejects a path not on the allowlist with 404 (no upstream call)", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const res = await proxyEngineGet(new Request("https://x.test/api/engine/secret"), "/secret");
    expect(res.status).toBe(404);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it.each(["/health", "/program", "/program/now", "/feed", "/videos", "/context/abc123", "/transcript/abc123"])(
    "allows allowlisted path %s",
    async (path) => {
      const fetchSpy = mockFetchOnce(200, JSON.stringify({ ok: true }));
      vi.stubGlobal("fetch", fetchSpy);
      const res = await proxyEngineGet(new Request("https://x.test/api/engine" + path), path);
      expect(res.status).toBe(200);
      expect(fetchSpy).toHaveBeenCalledOnce();
    },
  );
});

describe("engine proxy request behavior", () => {
  it("forwards the upstream status and body for an allowed GET", async () => {
    const fetchSpy = mockFetchOnce(200, JSON.stringify({ program: [] }));
    vi.stubGlobal("fetch", fetchSpy);
    const res = await proxyEngineGet(new Request("https://x.test/api/engine/program"), "/program");
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ program: [] });
  });

  it("attaches the X-Api-Key header and forwards query params", async () => {
    const fetchSpy = mockFetchOnce(200, "{}");
    vi.stubGlobal("fetch", fetchSpy);
    await proxyEngineGet(new Request("https://x.test/api/engine/feed?limit=5"), "/feed");
    const [calledUrl, init] = fetchSpy.mock.calls[0];
    expect(String(calledUrl)).toBe(`${BASE}/feed?limit=5`);
    expect((init as RequestInit).method).toBe("GET");
    expect((init as RequestInit).headers).toMatchObject({ "X-Api-Key": "secret-key" });
  });

  it("forwards the POST body and content-type", async () => {
    const fetchSpy = mockFetchOnce(201, JSON.stringify({ liked: true }));
    vi.stubGlobal("fetch", fetchSpy);
    const req = new Request("https://x.test/api/engine/feed/abc/like", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ x: 1 }),
    });
    const res = await proxyEnginePost(req, "/feed/abc/like");
    expect(res.status).toBe(201);
    const [, init] = fetchSpy.mock.calls[0];
    expect((init as RequestInit).method).toBe("POST");
    expect((init as RequestInit).body).toBe(JSON.stringify({ x: 1 }));
  });

  it("reports a configuration error instead of calling a hardcoded default", async () => {
    // Dřív tu byla zapečená adresa Replitu, takže chybějící konfigurace
    // tiše mířila na vypnutou službu. Nově musí selhat hlasitě.
    vi.stubEnv("NEXT_PUBLIC_ENGINE_URL", "");
    vi.stubEnv("ENGINE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_REPLIT_URL", "");
    vi.stubEnv("REPLIT_URL", "");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const res = await proxyEngineGet(new Request("https://x.test/api/engine/health"), "/health");
    expect(res.status).toBe(500);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns 502 when every upstream candidate throws", async () => {
    const fetchSpy = vi.fn(async () => {
      throw new Error("network down");
    });
    vi.stubGlobal("fetch", fetchSpy);
    const res = await proxyEngineGet(new Request("https://x.test/api/engine/health"), "/health");
    expect(res.status).toBe(502);
    const payload = (await res.json()) as { error: string; attempts: string[] };
    expect(payload.error).toMatch(/failed/i);
    expect(Array.isArray(payload.attempts)).toBe(true);
  });

  it("tries the configured engine exactly once and reports 502 on 404", async () => {
    // Dřív se po 404 zkoušel druhý, zapečený host. Ten je pryč, takže zůstává
    // jediný pokus; 502 na konci je stávající chování proxy a záměrně ho
    // v rámci přejmenování neměníme.
    vi.stubEnv("NEXT_PUBLIC_ENGINE_URL", "https://engine.test");
    const fetchSpy = vi.fn().mockResolvedValue(new Response("not found", { status: 404 }));
    vi.stubGlobal("fetch", fetchSpy);
    const res = await proxyEngineGet(new Request("https://x.test/api/engine/health"), "/health");
    expect(res.status).toBe(502);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});

import { describe, it, expect, beforeEach, vi } from "vitest";
import { proxyAnalyticalGet, proxyAnalyticalPost } from "@/lib/analyticalProxy";

const BASE = "https://analytical-service-abjasno.replit.app";

function mockFetchOnce(status: number, body: string) {
  return vi.fn(async () => new Response(body, { status, headers: { "content-type": "application/json" } }));
}

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("ANALYTICAL_SERVICE_URL", BASE);
  vi.stubEnv("CONTEXT_API_KEY", "ctx-key");
});

describe("analytical proxy path allowlist", () => {
  it("rejects a non-allowlisted path with 404 (no upstream call)", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const res = await proxyAnalyticalGet(new Request("https://x.test/api/analytical/secret"), "/secret");
    expect(res.status).toBe(404);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it.each(["/health", "/context/abc", "/api/context/abc", "/context/video/v1", "/context/job/j1"])(
    "allows allowlisted path %s",
    async (path) => {
      const fetchSpy = mockFetchOnce(200, "{}");
      vi.stubGlobal("fetch", fetchSpy);
      const res = await proxyAnalyticalGet(new Request("https://x.test/api/analytical" + path), path);
      expect(res.status).toBe(200);
      expect(fetchSpy).toHaveBeenCalledOnce();
    },
  );
});

describe("analytical proxy request behavior", () => {
  it("forwards status/body and attaches X-Api-Key", async () => {
    const fetchSpy = mockFetchOnce(200, JSON.stringify({ context: "ok" }));
    vi.stubGlobal("fetch", fetchSpy);
    const res = await proxyAnalyticalGet(new Request("https://x.test/api/analytical/context/abc"), "/context/abc");
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ context: "ok" });
    const [, init] = fetchSpy.mock.calls[0];
    expect((init as RequestInit).headers).toMatchObject({ "X-Api-Key": "ctx-key" });
  });

  it("returns 502 when the upstream throws", async () => {
    const fetchSpy = vi.fn(async () => {
      throw new Error("boom");
    });
    vi.stubGlobal("fetch", fetchSpy);
    const res = await proxyAnalyticalGet(new Request("https://x.test/api/analytical/health"), "/health");
    expect(res.status).toBe(502);
  });

  it("forwards the POST body", async () => {
    const fetchSpy = mockFetchOnce(200, "{}");
    vi.stubGlobal("fetch", fetchSpy);
    const req = new Request("https://x.test/api/analytical/context/abc", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ q: "hi" }),
    });
    await proxyAnalyticalPost(req, "/context/abc");
    const [, init] = fetchSpy.mock.calls[0];
    expect((init as RequestInit).body).toBe(JSON.stringify({ q: "hi" }));
  });
});

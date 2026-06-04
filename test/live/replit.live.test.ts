import { describe, it, expect, beforeAll } from "vitest";

/**
 * LIVE behavioral tests against the real Replit backend.
 *
 * These are EXCLUDED from the default `npm test` run (see vitest.config.ts) and
 * only execute when RUN_REPLIT_LIVE=1, e.g. `npm run test:live`. They make real
 * network calls to the running Replit playout/feed service and assert the
 * shape, status, and latency of its responses — this is the "chování backendu
 * na Replitu" contract from the running service's perspective.
 *
 * Most data endpoints require an X-Api-Key. Without a key we assert that auth is
 * enforced (401/403); with REPLIT_API_KEY we assert the response shape. Only
 * /health is public.
 *
 * Configure via env:
 *   REPLIT_LIVE_URL   (default: https://attached-assets-abjasno.replit.app)
 *   REPLIT_API_KEY    (sent as X-Api-Key when present)
 */

// Treat an empty env (e.g. an unset CI secret resolves to "") as "use default",
// not as a literal empty base URL.
const RAW_BASE = process.env.REPLIT_LIVE_URL?.trim();
const BASE = (RAW_BASE && RAW_BASE.length > 0 ? RAW_BASE : "https://attached-assets-abjasno.replit.app").replace(/\/+$/, "");
const API_KEY = process.env.REPLIT_API_KEY ?? process.env.FEED_API_KEY ?? "";
const TIMEOUT_MS = 15_000;

async function timedFetch(path: string, { withKey = true }: { withKey?: boolean } = {}) {
  const startedAt = Date.now();
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      Accept: "application/json",
      ...(withKey && API_KEY ? { "X-Api-Key": API_KEY } : {}),
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const elapsedMs = Date.now() - startedAt;
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { res, json, text, elapsedMs };
}

describe("Replit backend — live behavior", () => {
  beforeAll(() => {
    // eslint-disable-next-line no-console
    console.log(`[live] target backend: ${BASE} (api key: ${API_KEY ? "set" : "none"})`);
  });

  it("GET /health responds 2xx within the latency budget (public)", async () => {
    const { res, elapsedMs } = await timedFetch("/health", { withKey: false });
    expect(res.status, "unexpected status from /health").toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(300);
    expect(elapsedMs, "health check should be fast").toBeLessThan(TIMEOUT_MS);
  });

  it("protects /program behind an API key", async () => {
    const { res } = await timedFetch("/program", { withKey: false });
    expect([401, 403]).toContain(res.status);
  });

  it("GET /program returns a JSON program payload when authenticated", async () => {
    if (!API_KEY) {
      // eslint-disable-next-line no-console
      console.log("[live] REPLIT_API_KEY not set — skipping authenticated /program assertion");
      return;
    }
    const { res, json } = await timedFetch("/program");
    expect(res.status).toBe(200);
    expect(json, "expected a JSON body").not.toBeNull();
    expect(typeof json).toBe("object");
    const blocks = (json as { blocks?: unknown[]; timeline?: unknown[] }).blocks ??
      (json as { timeline?: unknown[] }).timeline ?? [];
    expect(Array.isArray(blocks)).toBe(true);
  });

  it("protects /feed behind an API key", async () => {
    const { res } = await timedFetch("/feed", { withKey: false });
    expect([401, 403]).toContain(res.status);
  });

  it("GET /feed returns a list-like payload when authenticated", async () => {
    if (!API_KEY) {
      // eslint-disable-next-line no-console
      console.log("[live] REPLIT_API_KEY not set — skipping authenticated /feed assertion");
      return;
    }
    const { res, json } = await timedFetch("/feed");
    expect(res.status).toBe(200);
    const isListLike = Array.isArray(json) || (json !== null && typeof json === "object");
    expect(isListLike).toBe(true);
  });

  it("returns a 4xx (not a 5xx crash) for an unknown path", async () => {
    const { res } = await timedFetch("/__definitely_not_a_real_endpoint__", { withKey: false });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status, "backend should not 5xx on an unknown route").toBeLessThan(500);
  });
});

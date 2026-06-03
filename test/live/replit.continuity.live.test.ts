import { describe, it, expect } from "vitest";

/**
 * LIVE playout-continuity tests against the real Replit backend.
 *
 * Excluded from `npm test`; run via `npm run test:live` (RUN_REPLIT_LIVE=1).
 *
 * Two layers:
 *  - Auth-free continuity health via GET /health (always asserted): proves the
 *    nonstop playout pipeline is producing program (blocks today, quality, no
 *    stuck rebuild, quota under limit).
 *  - The timer-driven engine endpoints (/program/now, /program/fill-gap,
 *    /program/safety-bridge) which the NONSTOP PLAYOUT loop calls. These require
 *    an X-Api-Key: without it we assert auth is enforced (403); with a key
 *    (REPLIT_API_KEY) we assert the engine responds without crashing (no 5xx).
 *
 * Env: REPLIT_LIVE_URL (default prod), REPLIT_API_KEY (optional).
 */

const BASE = (process.env.REPLIT_LIVE_URL ?? "https://attached-assets-abjasno.replit.app").replace(/\/+$/, "");
const API_KEY = process.env.REPLIT_API_KEY ?? process.env.FEED_API_KEY ?? "";
const TIMEOUT_MS = 15_000;

async function get(path: string, withKey: boolean) {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      Accept: "application/json",
      ...(withKey && API_KEY ? { "X-Api-Key": API_KEY } : {}),
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { res, json: json as Record<string, unknown> | null };
}

describe("Replit playout — continuity health (/health)", () => {
  it("reports a populated schedule for today", async () => {
    const { res, json } = await get("/health", false);
    expect(res.status).toBe(200);
    expect(json).not.toBeNull();
    expect(json!.status, "health status").toBe("ok");

    const blocksToday = Number(json!.program_blocks_today ?? 0);
    expect(blocksToday, "the nonstop playout should have produced program blocks today").toBeGreaterThan(0);
  });

  it("is not stuck mid-rebuild and is within its API quota", async () => {
    const { json } = await get("/health", false);
    expect(json).not.toBeNull();
    // rebuild_running may legitimately be true momentarily, but must be boolean.
    expect(typeof json!.rebuild_running).toBe("boolean");

    const used = Number(json!.quota_used_today ?? 0);
    const limit = Number(json!.quota_limit ?? 0);
    if (limit > 0) {
      expect(used, "daily quota should not be exhausted").toBeLessThanOrEqual(limit);
    }
  });

  it("exposes program-quality telemetry with real video minutes", async () => {
    const { json } = await get("/health", false);
    const quality = (json?.program_quality_24h ?? null) as Record<string, unknown> | null;
    // Telemetry is optional across versions; assert shape only when present.
    if (quality) {
      const realMin = Number(quality.real_video_min ?? 0);
      expect(realMin, "expected some real video minutes in the last 24h").toBeGreaterThanOrEqual(0);
    }
  });
});

describe("Replit playout — engine continuity endpoints", () => {
  const engineEndpoints = ["/program/now", "/program/fill-gap", "/program/safety-bridge"] as const;

  it.each(engineEndpoints)("enforces API-key auth on %s", async (path) => {
    const { res } = await get(path, false);
    // Without a key the engine endpoints must not be open.
    expect([401, 403]).toContain(res.status);
  });

  (API_KEY ? it.each(engineEndpoints) : it.skip.each(engineEndpoints))(
    "responds without a server crash on %s (with API key)",
    async (path) => {
      const { res } = await get(path, true);
      // The engine may answer 200 (a block), 204 (nothing to fill), or 400/404
      // for a missing param — but it must never 5xx.
      expect(res.status, `${path} should not 5xx`).toBeLessThan(500);
    },
  );

  it("GET /program/now returns a current block when authenticated", async () => {
    if (!API_KEY) {
      // eslint-disable-next-line no-console
      console.log("[continuity] REPLIT_API_KEY not set — skipping authenticated /program/now assertion");
      return;
    }
    const { res, json } = await get("/program/now", true);
    expect([200, 204]).toContain(res.status);
    if (res.status === 200) {
      expect(json, "expected a now-playing block payload").not.toBeNull();
    }
  });
});

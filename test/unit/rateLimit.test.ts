import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  checkRateLimit,
  enforceWriteRateLimit,
  rateLimitResponse,
  resolveClientIp,
  RATE_LIMITS,
} from "@/lib/rateLimit";

// Each test uses a unique scope so the module-level bucket Map does not leak
// state between tests (the limiter is a per-instance in-memory store).
let counter = 0;
function uniqueScope(): string {
  counter += 1;
  return `test-scope-${counter}`;
}

function makeRequest(headers: Record<string, string> = {}, url = "https://x.test/api"): Request {
  return new Request(url, { headers });
}

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-03T10:00:00.000Z"));
  });

  it("allows the first request and decrements remaining", () => {
    const result = checkRateLimit({ scope: uniqueScope(), identifier: "ip", limit: 3, windowMs: 1000 });
    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(3);
    expect(result.remaining).toBe(2);
    expect(result.resetAt).toBe(Date.now() + 1000);
  });

  it("blocks once the limit within the window is reached", () => {
    const scope = uniqueScope();
    const opts = { scope, identifier: "ip", limit: 2, windowMs: 1000 };
    expect(checkRateLimit(opts).allowed).toBe(true);
    expect(checkRateLimit(opts).allowed).toBe(true);
    const blocked = checkRateLimit(opts);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("resets after the window elapses", () => {
    const scope = uniqueScope();
    const opts = { scope, identifier: "ip", limit: 1, windowMs: 1000 };
    expect(checkRateLimit(opts).allowed).toBe(true);
    expect(checkRateLimit(opts).allowed).toBe(false);
    vi.advanceTimersByTime(1001);
    expect(checkRateLimit(opts).allowed).toBe(true);
  });

  it("tracks separate identifiers independently", () => {
    const scope = uniqueScope();
    const a = checkRateLimit({ scope, identifier: "a", limit: 1, windowMs: 1000 });
    const b = checkRateLimit({ scope, identifier: "b", limit: 1, windowMs: 1000 });
    expect(a.allowed).toBe(true);
    expect(b.allowed).toBe(true);
  });
});

describe("resolveClientIp", () => {
  it("uses the first entry of x-forwarded-for", () => {
    const ip = resolveClientIp(makeRequest({ "x-forwarded-for": "1.1.1.1, 2.2.2.2" }));
    expect(ip).toBe("1.1.1.1");
  });

  it("falls back to x-real-ip", () => {
    expect(resolveClientIp(makeRequest({ "x-real-ip": "9.9.9.9" }))).toBe("9.9.9.9");
  });

  it("returns a sentinel when no ip header is present", () => {
    expect(resolveClientIp(makeRequest())).toBe("unknown-ip");
  });
});

describe("rateLimitResponse", () => {
  it("returns a 429 with rate-limit headers", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-03T10:00:00.000Z"));
    const resetAt = Date.now() + 5000;
    const res = rateLimitResponse({ allowed: false, limit: 60, remaining: 0, resetAt });
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("5");
    expect(res.headers.get("X-RateLimit-Limit")).toBe("60");
    expect(res.headers.get("X-RateLimit-Remaining")).toBe("0");
    expect(res.headers.get("X-RateLimit-Reset")).toBe(String(Math.ceil(resetAt / 1000)));
  });
});

describe("enforceWriteRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-03T10:00:00.000Z"));
  });

  it("allows traffic under the burst cap (returns null)", () => {
    const scope = uniqueScope();
    const req = makeRequest({ "x-forwarded-for": "5.5.5.5" });
    expect(enforceWriteRateLimit(req, scope)).toBeNull();
  });

  it("blocks once the per-minute burst cap is exceeded", () => {
    const scope = uniqueScope();
    const req = makeRequest({ "x-forwarded-for": "6.6.6.6" });
    let blocked: Response | null = null;
    for (let i = 0; i <= RATE_LIMITS.perIpPerMinute.limit; i += 1) {
      blocked = enforceWriteRateLimit(req, scope);
    }
    expect(blocked).not.toBeNull();
    expect(blocked?.status).toBe(429);
  });
});

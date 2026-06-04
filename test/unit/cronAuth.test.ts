import { describe, it, expect, vi } from "vitest";
import { isCronAuthorized } from "@/lib/cronAuth";

function req(headers: Record<string, string> = {}, url = "https://x.test/api/cron"): Request {
  return new Request(url, { headers });
}

describe("isCronAuthorized", () => {
  it("authorizes everything when no secret is configured", () => {
    vi.stubEnv("PROGRAM_CACHE_CRON_SECRET", "");
    vi.stubEnv("CRON_SECRET", "");
    expect(isCronAuthorized(req())).toBe(true);
  });

  it("accepts a matching Bearer token", () => {
    vi.stubEnv("PROGRAM_CACHE_CRON_SECRET", "top-secret");
    vi.stubEnv("CRON_SECRET", "");
    expect(isCronAuthorized(req({ authorization: "Bearer top-secret" }))).toBe(true);
  });

  it("rejects a wrong Bearer token", () => {
    vi.stubEnv("PROGRAM_CACHE_CRON_SECRET", "top-secret");
    vi.stubEnv("CRON_SECRET", "");
    expect(isCronAuthorized(req({ authorization: "Bearer nope" }))).toBe(false);
  });

  it("rejects a token of the wrong length without throwing", () => {
    vi.stubEnv("PROGRAM_CACHE_CRON_SECRET", "top-secret");
    vi.stubEnv("CRON_SECRET", "");
    expect(isCronAuthorized(req({ authorization: "Bearer x" }))).toBe(false);
  });

  it("accepts either configured secret (PROGRAM_CACHE_CRON_SECRET or CRON_SECRET)", () => {
    vi.stubEnv("PROGRAM_CACHE_CRON_SECRET", "first");
    vi.stubEnv("CRON_SECRET", "second");
    expect(isCronAuthorized(req({ authorization: "Bearer first" }))).toBe(true);
    expect(isCronAuthorized(req({ authorization: "Bearer second" }))).toBe(true);
  });

  it("accepts the secret via the ?secret= query parameter", () => {
    vi.stubEnv("PROGRAM_CACHE_CRON_SECRET", "qsecret");
    vi.stubEnv("CRON_SECRET", "");
    expect(isCronAuthorized(req({}, "https://x.test/api/cron?secret=qsecret"))).toBe(true);
  });

  it("rejects when a secret is configured but none is provided", () => {
    vi.stubEnv("PROGRAM_CACHE_CRON_SECRET", "needed");
    vi.stubEnv("CRON_SECRET", "");
    expect(isCronAuthorized(req())).toBe(false);
  });
});

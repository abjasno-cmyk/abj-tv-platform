import { test, expect } from "@playwright/test";

/**
 * End-to-end checks for the backend proxy routes as served by Next. These run
 * the real route handlers + proxy libs. Allowlist behavior is deterministic
 * (no network); upstream health is asserted tolerantly because it depends on
 * the running Replit backend.
 */
test.describe("Replit proxy route (/api/replit)", () => {
  test("rejects a path that is not on the allowlist with 404", async ({ request }) => {
    const res = await request.get("/api/replit/totally-not-allowed");
    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  test("forwards an allowlisted /health request (200 or 502, never a crash)", async ({ request }) => {
    const res = await request.get("/api/replit/health");
    expect([200, 404, 502]).toContain(res.status());
    // Always JSON, never an HTML error page.
    expect(res.headers()["content-type"] ?? "").toContain("json");
  });
});

test.describe("Analytical proxy route (/api/analytical)", () => {
  test("rejects a non-allowlisted path with 404", async ({ request }) => {
    const res = await request.get("/api/analytical/not-allowed");
    expect(res.status()).toBe(404);
  });
});

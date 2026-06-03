import { test, expect } from "@playwright/test";
import { BasePage } from "./pages/BasePage";

/**
 * Smoke coverage for the public surface. These assert that each key route
 * renders server-side without a 5xx crash and produces a non-empty document.
 * They are intentionally data-tolerant: the app degrades gracefully when the
 * Supabase / Replit backends return nothing, so we don't assert on dynamic
 * content here (that belongs in feature specs with seeded data).
 */
const PUBLIC_ROUTES = [
  "/live",
  "/program",
  "/jasne-zpravy",
  "/videa",
  "/archiv",
  "/v-kostce",
  "/komunita",
  "/terms",
  "/privacy",
] as const;

test.describe("public routes smoke", () => {
  for (const route of PUBLIC_ROUTES) {
    test(`renders ${route} without a server error`, async ({ page }) => {
      const base = new BasePage(page);
      const response = await base.goto(route);

      // We may be redirected (e.g. "/" → "/live"); assert the final response is
      // not a server crash.
      expect(response, `no response for ${route}`).not.toBeNull();
      expect(response!.status(), `unexpected status for ${route}`).toBeLessThan(500);

      await expect(page.locator("body")).not.toBeEmpty();
    });
  }

  test("home redirects to /live", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/live$/);
  });

  test("document title carries the VEROX brand", async ({ page }) => {
    await page.goto("/live");
    await expect(page).toHaveTitle(/VEROX/i);
  });
});

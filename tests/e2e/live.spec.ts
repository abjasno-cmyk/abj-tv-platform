import { test, expect } from "@playwright/test";

/**
 * Focused checks for the /live playout page — the app's home destination.
 * The page is data-tolerant (renders its template shell even with no program
 * data), so we anchor on the stable template marker rather than dynamic copy.
 */
test.describe("/live playout page", () => {
  test("renders the playout template shell", async ({ page }) => {
    await page.goto("/live");
    const template = page.locator('section[data-ui-version="abj-template-v1"]');
    await expect(template).toBeVisible();
  });

  test("does not surface an unhandled Next.js error overlay", async ({ page }) => {
    await page.goto("/live");
    // Next renders a recognizable error boundary heading when a server
    // component throws uncaught; its absence means graceful rendering.
    await expect(page.getByText(/Application error|Internal Server Error/i)).toHaveCount(0);
  });

  test("supports deep-linking a specific video via /videa/[videoId]", async ({ page }) => {
    const response = await page.goto("/videa/dQw4w9WgXcQ");
    expect(response?.status()).toBeLessThan(500);
    await expect(page.locator('section[data-ui-version="abj-template-v1"]')).toBeVisible();
  });

  test("redirects legacy /live?videoId links to /videa/[videoId]", async ({ page }) => {
    const response = await page.goto("/live?videoId=dQw4w9WgXcQ");
    expect(response?.status()).toBeLessThan(500);
    await expect(page).toHaveURL(/\/videa\/dQw4w9WgXcQ/);
  });
});

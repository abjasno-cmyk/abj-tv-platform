import type { Page, Response } from "@playwright/test";

/**
 * Thin Page Object base shared by all page objects. Encapsulates navigation
 * and a couple of resilience helpers so specs stay declarative.
 */
export class BasePage {
  constructor(protected readonly page: Page) {}

  async goto(path: string): Promise<Response | null> {
    const response = await this.page.goto(path, { waitUntil: "domcontentloaded" });
    return response;
  }

  title() {
    return this.page.title();
  }

  /** True when the page rendered actual content (not a blank/error shell). */
  async hasRenderedBody(): Promise<boolean> {
    const text = await this.page.locator("body").innerText().catch(() => "");
    return text.trim().length > 0;
  }
}

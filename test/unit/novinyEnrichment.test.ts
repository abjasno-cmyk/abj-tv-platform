import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { extractMainArticleText, isLikelyPaywallOrCaptcha } from "@/lib/noviny/enrichment";

describe("noviny article enrichment extraction", () => {
  it("extracts a normal public article from article paragraphs", () => {
    const paragraph =
      "Toto je veřejně dostupný odstavec článku s dostatečně dlouhým textem pro bezpečnou extrakci hlavního obsahu. ";
    const html = `<html><body><article>${Array.from({ length: 8 }, () => `<p>${paragraph}</p>`).join("")}</article></body></html>`;
    const extracted = extractMainArticleText(html);
    expect(extracted?.method).toBe("html-article-p");
    expect(extracted?.text.length).toBeGreaterThan(500);
  });

  it("returns null when main article text is missing", () => {
    const extracted = extractMainArticleText("<html><body><nav>Menu</nav><p>Krátké.</p></body></html>");
    expect(extracted).toBeNull();
  });

  it("detects paywall or captcha pages", () => {
    expect(isLikelyPaywallOrCaptcha("<html><body>Subscribe to continue reading this premium content.</body></html>")).toBe(
      true,
    );
    expect(isLikelyPaywallOrCaptcha("<html><body><article><p>Veřejný článek.</p></article></body></html>")).toBe(false);
  });

  it("extracts a long article without storing the original html", () => {
    const paragraph =
      "Dlouhý text článku popisuje veřejnou událost, aktéry, kontext a důsledky bez nutnosti kopírovat celý obsah. ";
    const html = `<main>${Array.from({ length: 140 }, () => `<p>${paragraph}</p>`).join("")}</main>`;
    const extracted = extractMainArticleText(html);
    expect(extracted?.method).toBe("html-main-p");
    expect(extracted?.text.length).toBeGreaterThan(8000);
  });
});

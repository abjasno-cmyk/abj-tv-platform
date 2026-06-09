import { describe, expect, it } from "vitest";

import { buildSocialShareUrl } from "@/lib/share/socialShare";

describe("buildSocialShareUrl", () => {
  const url = "https://verox.tv/nazory/test-clanek";
  const title = "Test článek";

  it("builds Facebook share URL", () => {
    expect(buildSocialShareUrl("facebook", url)).toBe(
      "https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(url),
    );
  });

  it("builds X share URL with title", () => {
    expect(buildSocialShareUrl("x", url, title)).toBe(
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
    );
  });

  it("builds WhatsApp share URL with title and link", () => {
    expect(buildSocialShareUrl("whatsapp", url, title)).toBe(
      `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`,
    );
  });

  it("builds Telegram share URL", () => {
    expect(buildSocialShareUrl("telegram", url, title)).toBe(
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
    );
  });
});

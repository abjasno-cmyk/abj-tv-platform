import { describe, expect, it } from "vitest";

import { inferSourceSlug, normalizeExternalUrl } from "@/lib/noviny/url";

describe("noviny url helpers", () => {
  it("normalizes external url and removes tracking params", () => {
    expect(
      normalizeExternalUrl("https://Example.com/clanek/?utm_source=abc&id=10&fbclid=XXX#sekce"),
    ).toBe("https://example.com/clanek?id=10");
  });

  it("rejects non-http protocols", () => {
    expect(normalizeExternalUrl("javascript:alert(1)")).toBeNull();
  });

  it("creates safe slug from source name", () => {
    expect(inferSourceSlug("Český Rozhlas 24")).toBe("cesky-rozhlas-24");
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";

import { LOCALE_CS, LOCALE_EN, resolveLocaleFromHostPath } from "@/lib/i18n/config";

describe("resolveLocaleFromHostPath", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("keeps verox.cz Czech by default", () => {
    expect(resolveLocaleFromHostPath("www.verox.cz", "/noviny")).toBe(LOCALE_CS);
  });

  it("uses English locale on veroxmed.com", () => {
    expect(resolveLocaleFromHostPath("www.veroxmed.com", "/noviny")).toBe(LOCALE_EN);
    expect(resolveLocaleFromHostPath("veroxmed.com:443", "/live")).toBe(LOCALE_EN);
  });

  it("uses English locale on /en paths", () => {
    expect(resolveLocaleFromHostPath("www.verox.cz", "/en")).toBe(LOCALE_EN);
    expect(resolveLocaleFromHostPath("www.verox.cz", "/en/noviny")).toBe(LOCALE_EN);
  });

  it("can disable English locale with feature flag", () => {
    vi.stubEnv("VEROX_EN_ENABLED", "false");
    expect(resolveLocaleFromHostPath("www.veroxmed.com", "/live")).toBe(LOCALE_CS);
    expect(resolveLocaleFromHostPath("www.verox.cz", "/en/live")).toBe(LOCALE_CS);
  });
});

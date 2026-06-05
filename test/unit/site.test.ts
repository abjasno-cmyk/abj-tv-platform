import { describe, it, expect, vi, afterEach } from "vitest";

// site.ts resolves its constants at module-load time from env, so each case
// stubs env, resets the module registry, then re-imports a fresh copy.
async function loadSite() {
  vi.resetModules();
  return import("@/lib/site");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("site constants", () => {
  it("defaults to the vercel host when no env is set", async () => {
    // Unset (undefined), not empty string — site.ts uses `??`, which treats
    // an empty string as a present value.
    vi.stubEnv("NEXT_PUBLIC_CANONICAL_HOST", undefined);
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", undefined);
    const { CANONICAL_HOST, SITE_URL } = await loadSite();
    expect(CANONICAL_HOST).toBe("abj-tv-platform-n7e8.vercel.app");
    expect(SITE_URL).toBe("https://abj-tv-platform-n7e8.vercel.app");
  });

  it("lowercases and trims the configured canonical host", async () => {
    vi.stubEnv("NEXT_PUBLIC_CANONICAL_HOST", "  WWW.Verox.CZ  ");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", undefined);
    const { CANONICAL_HOST, SITE_URL } = await loadSite();
    expect(CANONICAL_HOST).toBe("www.verox.cz");
    expect(SITE_URL).toBe("https://www.verox.cz");
  });

  it("strips trailing slashes from an explicit site url", async () => {
    vi.stubEnv("NEXT_PUBLIC_CANONICAL_HOST", "verox.cz");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://verox.cz///");
    const { SITE_URL } = await loadSite();
    expect(SITE_URL).toBe("https://verox.cz");
  });
});

describe("LEGACY_VERCEL_HOST_PATTERN", () => {
  it("matches the bare canonical host and branch preview hosts", async () => {
    const { LEGACY_VERCEL_HOST_PATTERN } = await loadSite();
    expect(LEGACY_VERCEL_HOST_PATTERN.test("abj-tv-platform-n7e8.vercel.app")).toBe(true);
    expect(LEGACY_VERCEL_HOST_PATTERN.test("abj-tv-platform-n7e8-git-feat-x.vercel.app")).toBe(true);
  });

  it("does not match unrelated hosts", async () => {
    const { LEGACY_VERCEL_HOST_PATTERN } = await loadSite();
    expect(LEGACY_VERCEL_HOST_PATTERN.test("verox.cz")).toBe(false);
    expect(LEGACY_VERCEL_HOST_PATTERN.test("evil-abj-tv-platform-n7e8.vercel.app.attacker.com")).toBe(false);
  });
});

describe("resolveAuthCallbackOrigin", () => {
  it("keeps preview deployment host after OAuth", async () => {
    const { resolveAuthCallbackOrigin } = await loadSite();
    const previewUrl = new URL("https://abj-tv-platform-n7e8-git-cursor-pr-120.vercel.app/auth/callback");
    expect(resolveAuthCallbackOrigin(previewUrl, "preview")).toBe(
      "https://abj-tv-platform-n7e8-git-cursor-pr-120.vercel.app",
    );
  });

  it("keeps git branch host when VERCEL_ENV is missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_CANONICAL_HOST", "www.verox.cz");
    const { resolveAuthCallbackOrigin } = await loadSite();
    const previewUrl = new URL("https://abj-tv-platform-n7e8-git-cursor-pr-120.vercel.app/auth/callback");
    expect(resolveAuthCallbackOrigin(previewUrl, undefined)).toBe(
      "https://abj-tv-platform-n7e8-git-cursor-pr-120.vercel.app",
    );
  });

  it("keeps custom domain on production", async () => {
    const { resolveAuthCallbackOrigin } = await loadSite();
    const veroxUrl = new URL("https://www.verox.cz/auth/callback");
    expect(resolveAuthCallbackOrigin(veroxUrl, "production")).toBe("https://www.verox.cz");
  });
});

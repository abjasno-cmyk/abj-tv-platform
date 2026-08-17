import { describe, expect, it } from "vitest";

import { isApiPathAllowed, isPageAllowed, moduleEnabled, resolveTenant } from "@/lib/tenant";

describe("resolveTenant", () => {
  it("bez env vrací VEROX se všemi moduly (současná produkce beze změny)", () => {
    const tenant = resolveTenant(undefined);
    expect(tenant.id).toBe("verox");
    expect(Object.values(tenant.modules).every(Boolean)).toBe(true);
    expect(tenant.pageAllowPrefixes).toBeNull();
  });

  it("neznámý tenant padá zpět na VEROX", () => {
    expect(resolveTenant("nonexistent").id).toBe("verox");
    expect(resolveTenant("  ").id).toBe("verox");
  });

  it("proudx: jen live+VOD, žádné přihlášení", () => {
    const tenant = resolveTenant("ProudX");
    expect(tenant.id).toBe("proudx");
    expect(moduleEnabled("noviny", tenant)).toBe(false);
    expect(moduleEnabled("nazory", tenant)).toBe(false);
    expect(moduleEnabled("komunita", tenant)).toBe(false);
    expect(moduleEnabled("studio", tenant)).toBe(false);
    expect(moduleEnabled("auth", tenant)).toBe(false);
  });
});

describe("isPageAllowed", () => {
  const verox = resolveTenant("verox");
  const proudx = resolveTenant("proudx");

  it("VEROX povoluje vše", () => {
    for (const path of ["/", "/live", "/noviny", "/nazory/clanek", "/muj-verox", "/studio"]) {
      expect(isPageAllowed(path, verox)).toBe(true);
    }
  });

  it("ProudX povoluje live+VOD svět a právní stránky", () => {
    for (const path of [
      "/",
      "/live",
      "/videa",
      "/video/abc123",
      "/archiv",
      "/program",
      "/privacy",
      "/terms",
      "/sitemap-videos.xml",
    ]) {
      expect(isPageAllowed(path, proudx)).toBe(true);
    }
  });

  it("ProudX blokuje moduly VEROXu", () => {
    for (const path of [
      "/noviny",
      "/nazory",
      "/nazory/clanek-x",
      "/muj-verox",
      "/komunita",
      "/zed",
      "/abj-x",
      "/studio",
      "/admin",
      "/jasne-zpravy",
      "/v-kostce",
      "/autori",
      // prefix nesmí matchovat jako substring ("/videaXYZ" není "/videa")
      "/livestream-fake",
    ]) {
      expect(isPageAllowed(path, proudx)).toBe(false);
    }
  });

  it("prefix match je hranatý: /videa/x ano, /videax ne", () => {
    expect(isPageAllowed("/videa/nejnovejsi", proudx)).toBe(true);
    expect(isPageAllowed("/videax", proudx)).toBe(false);
  });
});

describe("isApiPathAllowed", () => {
  const verox = resolveTenant("verox");
  const proudx = resolveTenant("proudx");

  it("VEROX povoluje všechny API cesty", () => {
    for (const p of ["/api/wall/posts", "/api/nazory/articles", "/api/noviny/import", "/api/studio/sources"]) {
      expect(isApiPathAllowed(p, verox)).toBe(true);
    }
  });

  it("ProudX blokuje API vypnutých modulů (i zápisové service_role cesty)", () => {
    for (const p of [
      "/api/wall/posts",
      "/api/wall/posts/abc/react",
      "/api/abj-x/comments",
      "/api/nazory/articles",
      "/api/noviny/import",
      "/api/admin/noviny/sources",
      "/api/admin/wall/posts",
      "/api/studio/control",
      "/api/auth/bootstrap",
      "/api/viewer/comments",
    ]) {
      expect(isApiPathAllowed(p, proudx)).toBe(false);
    }
  });

  it("ProudX povoluje API potřebné pro live+VOD", () => {
    for (const p of [
      "/api/replit/program/now",
      "/api/program/v3/import-feed",
      "/api/live/channels",
      "/api/transcript/abc123",
      "/api/analytics/events",
    ]) {
      expect(isApiPathAllowed(p, proudx)).toBe(true);
    }
  });

  it("nekolizní prefix: /api/wallet není /api/wall", () => {
    expect(isApiPathAllowed("/api/wallet/x", proudx)).toBe(true);
  });
});

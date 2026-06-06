import { describe, expect, it, vi, afterEach } from "vitest";

import {
  buildAuthCompleteUrl,
  createAuthHandoffToken,
  parsePreviewHandoffNext,
  verifyAuthHandoffToken,
} from "@/lib/auth/handoff";
import {
  buildOAuthRedirectToForBrowser,
  sanitizeOAuthReturnPath,
  shouldUsePreviewAuthHandoff,
} from "@/lib/auth/oauthRedirect";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("oauth redirect helpers", () => {
  it("sanitizes return paths", () => {
    expect(sanitizeOAuthReturnPath("/nazory")).toBe("/nazory");
    expect(sanitizeOAuthReturnPath("//evil")).toBe("/live");
    expect(sanitizeOAuthReturnPath(null)).toBe("/live");
  });

  it("routes preview login through production handoff by default", () => {
    vi.stubEnv("NEXT_PUBLIC_PREVIEW_AUTH_HANDOFF", undefined);
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://www.verox.cz");
    expect(
      shouldUsePreviewAuthHandoff("abj-tv-platform-n7e8-git-cursor-nazory.vercel.app"),
    ).toBe(true);
    const url = buildOAuthRedirectToForBrowser({
      host: "abj-tv-platform-n7e8-git-cursor-nazory.vercel.app",
      origin: "https://abj-tv-platform-n7e8-git-cursor-nazory.vercel.app",
      returnPath: "/nazory/sprava",
    });
    expect(url).toContain("https://www.verox.cz/auth/callback");
    expect(url).toContain(encodeURIComponent("/api/auth/preview-continue"));
    expect(url).toContain("returnPath");
    expect(url).toContain("nazory");
  });

  it("can keep preview callback on the same origin when handoff is disabled", () => {
    vi.stubEnv("NEXT_PUBLIC_PREVIEW_AUTH_HANDOFF", "false");
    const url = buildOAuthRedirectToForBrowser({
      host: "abj-tv-platform-n7e8-git-cursor-nazory.vercel.app",
      origin: "https://abj-tv-platform-n7e8-git-cursor-nazory.vercel.app",
      returnPath: "/nazory",
    });
    expect(url).toContain("abj-tv-platform-n7e8-git-cursor-nazory.vercel.app/auth/callback");
    expect(url).toContain(encodeURIComponent("/nazory"));
  });
});

describe("auth handoff token", () => {
  it("roundtrips a short-lived preview session token", () => {
    vi.stubEnv("AUTH_HANDOFF_SECRET", "test-secret");
    const token = createAuthHandoffToken({
      accessToken: "access",
      refreshToken: "refresh",
      returnPath: "/nazory",
      returnOrigin: "https://abj-tv-platform-n7e8-git-cursor-nazory.vercel.app",
    });
    const verified = verifyAuthHandoffToken(token);
    expect(verified?.returnPath).toBe("/nazory");
    expect(verified?.accessToken).toBe("access");
  });

  it("parses preview handoff next paths", () => {
    const next =
      "/api/auth/preview-continue?returnOrigin=https%3A%2F%2Fabj-tv-platform-n7e8-git-cursor-nazory.vercel.app&returnPath=%2Fnazory";
    expect(parsePreviewHandoffNext(next)).toEqual({
      returnOrigin: "https://abj-tv-platform-n7e8-git-cursor-nazory.vercel.app",
      returnPath: "/nazory",
    });
    expect(
      buildAuthCompleteUrl(
        "https://abj-tv-platform-n7e8-git-cursor-nazory.vercel.app",
        "token",
      ),
    ).toContain("/auth/complete?handoff=token");
  });
});

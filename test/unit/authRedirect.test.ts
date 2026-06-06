import { describe, expect, it, vi, afterEach } from "vitest";

import {
  PREVIEW_ORIGIN_QUERY_PARAM,
  buildAuthCompleteUrl,
  buildPreviewHandoffCallbackUrl,
  createAuthHandoffToken,
  parsePreviewHandoffQuery,
  parsePreviewHandoffRequest,
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

  it("routes preview login through production handoff with separate preview_origin param", () => {
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
    expect(url).toContain(`${PREVIEW_ORIGIN_QUERY_PARAM}=`);
    expect(url).toContain(encodeURIComponent("/nazory/sprava"));
    expect(url).not.toContain("/api/auth/preview-continue");
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

  it("parses preview handoff callback query params", () => {
    const callbackUrl = buildPreviewHandoffCallbackUrl({
      productionOrigin: "https://www.verox.cz",
      previewOrigin: "https://abj-tv-platform-n7e8-git-cursor-nazory.vercel.app",
      returnPath: "/nazory",
    });
    const params = new URL(callbackUrl).searchParams;
    expect(parsePreviewHandoffRequest(params, params.get("next") ?? "/live")).toEqual({
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

  it("parses legacy preview-continue query params", () => {
    const params = new URLSearchParams({
      returnOrigin: "https://abj-tv-platform-n7e8-git-cursor-nazory.vercel.app",
      returnPath: "/nazory",
    });
    expect(parsePreviewHandoffQuery(params)).toEqual({
      returnOrigin: "https://abj-tv-platform-n7e8-git-cursor-nazory.vercel.app",
      returnPath: "/nazory",
    });
  });
});

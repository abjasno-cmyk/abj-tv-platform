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

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("preview auth handoff", () => {
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
    expect(params.get(PREVIEW_ORIGIN_QUERY_PARAM)).toContain("abj-tv-platform-n7e8-git-cursor-nazory.vercel.app");
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

import { describe, expect, it, vi, afterEach } from "vitest";

import {
  buildAuthCompleteUrl,
  createAuthHandoffToken,
  parsePreviewHandoffNext,
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

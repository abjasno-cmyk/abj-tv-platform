import { describe, expect, it } from "vitest";

import { extractYouTubeAvatarIdentifier, fallbackAvatarUrl } from "@/lib/liveChannelsServer";

describe("live channel avatar fallback", () => {
  it("extracts stable YouTube identifiers from channel URLs", () => {
    expect(extractYouTubeAvatarIdentifier("https://www.youtube.com/@ANOBudeLip/videos")).toBe("ANOBudeLip");
    expect(extractYouTubeAvatarIdentifier("https://www.youtube.com/channel/UC12345")).toBe("UC12345");
    expect(extractYouTubeAvatarIdentifier("https://www.youtube.com/c/DvojiMetr")).toBe("DvojiMetr");
    expect(extractYouTubeAvatarIdentifier("https://www.youtube.com/user/DoktorVajicko")).toBe("DoktorVajicko");
  });

  it("prefers URL handle over channel id for unavatar fallback", () => {
    expect(fallbackAvatarUrl("UC_STALE_OR_MISSING", "https://www.youtube.com/@DoktorVajicko")).toBe(
      "https://unavatar.io/youtube/DoktorVajicko",
    );
  });

  it("falls back to channel id when no channel URL identifier exists", () => {
    expect(fallbackAvatarUrl("UC_VALID", null)).toBe("https://unavatar.io/youtube/UC_VALID");
  });
});

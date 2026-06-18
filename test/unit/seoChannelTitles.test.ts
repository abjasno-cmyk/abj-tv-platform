import { describe, expect, it } from "vitest";

import { buildChannelMetaDescription, buildChannelSeoTitle } from "@/lib/seo/channelTitles";

describe("channel SEO titles", () => {
  it("uses dnes template for today's video", () => {
    const today = new Date().toISOString();
    expect(buildChannelSeoTitle("Bobošíková", today)).toBe("Bobošíková dnes | Verox");
  });

  it("uses nové video template for recent upload", () => {
    const recent = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    expect(buildChannelSeoTitle("Infovojna", recent)).toBe("Infovojna nové video | Verox");
  });

  it("uses fallback template for older channel", () => {
    const older = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    expect(buildChannelSeoTitle("Na rovinu", older)).toBe("Na rovinu videa a rozhovory | Verox");
  });

  it("builds Czech meta description within limit", () => {
    const description = buildChannelMetaDescription("Na rovinu", "Rozhovor o zdravotnictví");
    expect(description.length).toBeLessThanOrEqual(161);
    expect(description).toContain("Na rovinu");
    expect(description).toContain("Verox.cz");
  });
});

import { describe, expect, it } from "vitest";

import {
  buildChannelSlug,
  buildChannelSlugIndex,
  channelSeoPath,
  resolveChannelSlug,
} from "@/lib/seo/channelSlug";

describe("channel SEO slug", () => {
  it("builds slug from channel name", () => {
    expect(buildChannelSlug("Bobošíková")).toBe("bobosikova");
    expect(channelSeoPath("bobosikova")).toBe("/kanal/bobosikova");
  });

  it("resolves unique slugs for channels", () => {
    const { slugByChannelName, channelBySlug } = buildChannelSlugIndex([
      { channelName: "Na rovinu" },
      { channelName: "Infovojna" },
    ]);

    expect(resolveChannelSlug("Na rovinu", slugByChannelName)).toBe("na-rovinu");
    expect(channelBySlug.get("infovojna")?.channelName).toBe("Infovojna");
  });

  it("adds suffix when slug collides", () => {
    const taken = new Set<string>();
    expect(buildChannelSlug("Kanál", taken)).toBe("kanal");
    taken.add("kanal");
    expect(buildChannelSlug("Kanal", taken)).toBe("kanal-2");
  });
});

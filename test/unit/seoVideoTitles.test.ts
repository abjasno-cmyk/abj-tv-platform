import { describe, expect, it } from "vitest";

import { buildVideoMetaDescription, buildVideoSeoTitle } from "@/lib/seo/videoTitles";

describe("video SEO titles", () => {
  it("uses channel dnes template", () => {
    expect(buildVideoSeoTitle("Aktuální téma", "Bobošíková dnes")).toBe("Bobošíková dnes | Verox");
  });

  it("uses poslední díl template", () => {
    expect(buildVideoSeoTitle("Xaver Live poslední díl", "Xaver Live")).toBe("Xaver Live poslední díl | Verox");
  });

  it("uses rozhovor template", () => {
    expect(buildVideoSeoTitle("Rozhovor s Jindřichem Rajchlem", "Aby bylo jasno")).toContain("rozhovor");
  });

  it("builds meta description in Czech without exceeding limit", () => {
    const description = buildVideoMetaDescription("Zdravotnictví v Česku", "Na rovinu");
    expect(description.length).toBeLessThanOrEqual(161);
    expect(description).toContain("Verox.cz");
  });
});

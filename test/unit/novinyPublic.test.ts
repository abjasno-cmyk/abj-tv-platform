import { describe, expect, it } from "vitest";

import { getVisibleArticlePerex, getVisibleArticleTitle } from "@/lib/noviny/public";

describe("noviny public text rendering", () => {
  it("decodes html entities in title and perex", () => {
    expect(
      getVisibleArticleTitle({
        edited_title: null,
        title: "Dvo&#345;&#225;k: Zvl&#225;&#353;tn&#237; m&#237;sta",
      }),
    ).toBe("Dvořák: Zvláštní místa");

    expect(
      getVisibleArticlePerex({
        edited_perex: null,
        perex: "Projev na 24. sch&#367;zi Poslaneck&#233; sn&#283;movny.",
      }),
    ).toBe("Projev na 24. schůzi Poslanecké sněmovny.");
  });
});

import { describe, expect, it } from "vitest";

import {
  buildTranslateToCzechUrl,
  getArticleSummaryBullets,
  getVisibleArticlePerex,
  getVisibleArticleTitle,
  isCzechOrSlovak,
  languagePriority,
  shouldUseAutoTranslation,
} from "@/lib/noviny/public";

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

  it("builds translate url and language helpers", () => {
    expect(isCzechOrSlovak("cs")).toBe(true);
    expect(isCzechOrSlovak("sk")).toBe(true);
    expect(isCzechOrSlovak("en")).toBe(false);
    expect(buildTranslateToCzechUrl("https://example.com/a b")).toContain("tl=cs");
    expect(languagePriority("cs")).toBe(0);
    expect(languagePriority("sk")).toBe(1);
    expect(languagePriority("en")).toBe(2);
    expect(
      shouldUseAutoTranslation({
        language: "en",
        source: { id: "s1", name: "X", slug: "x", homepage_url: null, language: "en", country: "US" },
      }),
    ).toBe(true);
  });

  it("returns 3-5 summary bullets", () => {
    const bullets = getArticleSummaryBullets({
      id: "1",
      source_id: "s1",
      category_id: "c1",
      source_article_id: null,
      title: "Rozpočtová krize ve vládě",
      perex: "Vláda řeší deficit. Opozice mluví o riziku recese a drahých energií.",
      original_url: "https://example.com/x",
      canonical_url: "https://example.com/x",
      published_at: new Date().toISOString(),
      image_url: null,
      image_usage_safe: false,
      external_author: null,
      language: "cs",
      is_hidden: false,
      edited_title: null,
      edited_perex: null,
      metadata: {
        summary_source_text:
          "Ministr financí představil novou rozpočtovou strategii. Opatření se dotkne energií, cen a daňových změn. Analytici upozorňují na dopad na domácnosti. Opozice žádá mimořádné jednání. Další kroky mají padnout příští týden.",
      },
      imported_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      source: { id: "s1", name: "Zdroj", slug: "zdroj", homepage_url: null, language: "cs", country: "CZ" },
      category: { id: "c1", slug: "ekonomika", name: "Ekonomika" },
      tags: [],
    });

    expect(bullets.length).toBeGreaterThanOrEqual(3);
    expect(bullets.length).toBeLessThanOrEqual(5);
    expect(bullets[0]?.toLowerCase()).not.toContain("rozpočtová krize ve vládě");
  });

  it("returns no bullets when original text is missing", () => {
    const bullets = getArticleSummaryBullets({
      id: "2",
      source_id: "s1",
      category_id: "c1",
      source_article_id: null,
      title: "Krátká zpráva",
      perex: "Stručný popis",
      original_url: "https://example.com/y",
      canonical_url: "https://example.com/y",
      published_at: new Date().toISOString(),
      image_url: null,
      image_usage_safe: false,
      external_author: null,
      language: "cs",
      is_hidden: false,
      edited_title: null,
      edited_perex: null,
      metadata: {},
      imported_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      source: { id: "s1", name: "Zdroj", slug: "zdroj", homepage_url: null, language: "cs", country: "CZ" },
      category: { id: "c1", slug: "domaci", name: "Domácí" },
      tags: [],
    });
    expect(bullets).toEqual([]);
  });
});

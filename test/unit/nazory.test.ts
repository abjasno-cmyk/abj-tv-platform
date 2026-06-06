import { describe, expect, it } from "vitest";

import { validateArticleForPublish } from "@/lib/nazory/articles";
import {
  buildAutoSeoDescription,
  buildAutoSeoTitle,
  estimateReadingTimeFromContentJson,
  estimateReadingTimeMinutes,
  extractPlainTextFromTipTapJson,
} from "@/lib/nazory/content";
import {
  canUseAuthorFeatures,
  isAuthorRole,
  isNazoryAdminEmail,
  isNazoryAdminProfile,
  isNazoryAdminRole,
} from "@/lib/nazory/access";
import { buildArticleSlug, buildAuthorSlug, buildUniqueSlug, slugifyText } from "@/lib/nazory/slug";
import { extractYoutubeVideoId } from "@/lib/nazory/youtube";
import { getAuthorDisplayName } from "@/lib/nazory/display";

describe("nazory youtube helpers", () => {
  it("extracts youtube ids from common urls", () => {
    expect(extractYoutubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(extractYoutubeVideoId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });
});

describe("nazory slug helpers", () => {
  it("slugifies Czech diacritics", () => {
    expect(slugifyText("Český názor o politice")).toBe("cesky-nazor-o-politice");
    expect(buildAuthorSlug("Jan", "Novák", ["jan-novak"])).toBe("jan-novak-2");
    expect(buildArticleSlug("První článek", ["prvni-clanek", "prvni-clanek-2"])).toBe("prvni-clanek-3");
    expect(buildUniqueSlug("   ", [])).toBe("clanek");
  });
});

describe("nazory content helpers", () => {
  it("extracts plain text from TipTap JSON", () => {
    const text = extractPlainTextFromTipTapJson({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Krátký odstavec." }],
        },
        {
          type: "heading",
          content: [{ type: "text", text: "Nadpis" }],
        },
      ],
    });

    expect(text).toContain("Krátký odstavec.");
    expect(text).toContain("Nadpis");
    expect(estimateReadingTimeMinutes(text)).toBeGreaterThanOrEqual(1);
    expect(
      estimateReadingTimeFromContentJson({
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: "Slovo ".repeat(250) }] }],
      }),
    ).toBeGreaterThanOrEqual(2);
  });

  it("builds automatic SEO fields", () => {
    expect(buildAutoSeoTitle("Můj názor")).toBe("Můj názor — Názory");
    expect(buildAutoSeoDescription("a".repeat(200), "Titulek")).toHaveLength(160);
  });
});

describe("nazory access helpers", () => {
  it("detects admin and author roles", () => {
    expect(isNazoryAdminEmail("abjasno@gmail.com")).toBe(true);
    expect(isNazoryAdminEmail("other@example.com")).toBe(false);
    expect(isAuthorRole("author")).toBe(true);
    expect(isNazoryAdminRole("admin")).toBe(true);
    expect(isNazoryAdminProfile({ role: "viewer", email: "abjasno@gmail.com" })).toBe(true);
    expect(canUseAuthorFeatures({ role: "author" }, { is_active: true })).toBe(true);
    expect(canUseAuthorFeatures({ role: "author" }, { is_active: false })).toBe(false);
  });
});

describe("nazory author helpers", () => {
  it("builds display name", () => {
    expect(getAuthorDisplayName({ first_name: "Jan", last_name: "Novák" })).toBe("Jan Novák");
  });
});

describe("validateArticleForPublish", () => {
  const validContent = {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: "a".repeat(120) }],
      },
    ],
  };

  it("accepts valid article payload", () => {
    expect(() =>
      validateArticleForPublish({
        title: "Silný názor",
        perex: "a".repeat(25),
        content_json: validContent,
      }),
    ).not.toThrow();
  });

  it("rejects short content", () => {
    expect(() =>
      validateArticleForPublish({
        title: "Silný názor",
        perex: "a".repeat(25),
        content_json: { type: "doc", content: [] },
      }),
    ).toThrow("Obsah článku je příliš krátký.");
  });
});

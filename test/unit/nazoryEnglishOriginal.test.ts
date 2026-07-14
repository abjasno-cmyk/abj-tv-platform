import { describe, expect, it } from "vitest";

import { LOCALE_CS, LOCALE_EN } from "@/lib/i18n/config";
import {
  getOpinionArticleDisplay,
  getOpinionEnglishOriginal,
  stripOpinionEnglishOriginal,
  withOpinionEnglishOriginal,
} from "@/lib/nazory/englishOriginal";
import type { OpinionArticleRow } from "@/lib/nazory/types";

const czechDoc = {
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text: "České tělo." }] }],
};
const englishDoc = {
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text: "Original English body." }] }],
};

function article(contentJson: Record<string, unknown>): OpinionArticleRow {
  return {
    id: "a1",
    author_id: "u1",
    slug: "test",
    title: "Český titulek",
    perex: "Český perex",
    hero_image_path: null,
    content_json: contentJson,
    status: "published",
    published_at: "2026-01-01T00:00:00.000Z",
    deleted_at: null,
    reading_time_min: 1,
    seo_title: null,
    seo_description: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };
}

describe("opinion English original", () => {
  it("stores English original without replacing Czech content", () => {
    const combined = withOpinionEnglishOriginal(czechDoc, {
      title: "Original English title",
      perex: "Original English perex",
      contentJson: englishDoc,
    });

    expect(stripOpinionEnglishOriginal(combined)).toEqual(czechDoc);
    expect(getOpinionEnglishOriginal(combined)).toMatchObject({
      title: "Original English title",
      perex: "Original English perex",
    });
  });

  it("uses English original only for English display", () => {
    const combined = withOpinionEnglishOriginal(czechDoc, {
      title: "Original English title",
      perex: "Original English perex",
      contentJson: englishDoc,
    });
    const row = article(combined);

    expect(getOpinionArticleDisplay(row, LOCALE_CS).title).toBe("Český titulek");
    expect(getOpinionArticleDisplay(row, LOCALE_EN).title).toBe("Original English title");
    expect(getOpinionArticleDisplay(row, LOCALE_EN).perex).toBe("Original English perex");
    expect(getOpinionArticleDisplay(row, LOCALE_EN).content_json).toEqual(englishDoc);
  });
});

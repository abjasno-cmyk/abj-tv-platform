import { describe, expect, it } from "vitest";

import { LOCALE_CS, LOCALE_EN } from "@/lib/i18n/config";
import {
  getOpinionArticleDisplay,
  getOpinionEnglishAutoTranslation,
  getOpinionEnglishOriginal,
  stripOpinionEnglishOriginal,
  withOpinionEnglishAutoTranslation,
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
const autoDoc = {
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text: "Automatically translated body." }] }],
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

  it("uses automatic translation for English display when no manual original exists", () => {
    const combined = withOpinionEnglishAutoTranslation(czechDoc, {
      status: "generated",
      sourceHash: "hash-1",
      generatedAt: "2026-01-01T00:00:00.000Z",
      provider: "openai",
      title: "Automatically translated title",
      perex: "Automatically translated perex",
      contentJson: autoDoc,
    });
    const row = article(combined);

    expect(stripOpinionEnglishOriginal(combined)).toEqual(czechDoc);
    expect(getOpinionEnglishAutoTranslation(combined)).toMatchObject({
      status: "generated",
      title: "Automatically translated title",
    });
    expect(getOpinionArticleDisplay(row, LOCALE_EN).title).toBe("Automatically translated title");
    expect(getOpinionArticleDisplay(row, LOCALE_EN).content_json).toEqual(autoDoc);
  });

  it("keeps manual English original ahead of automatic translation", () => {
    const withAuto = withOpinionEnglishAutoTranslation(czechDoc, {
      status: "generated",
      sourceHash: "hash-1",
      generatedAt: "2026-01-01T00:00:00.000Z",
      provider: "openai",
      title: "Automatically translated title",
      perex: "Automatically translated perex",
      contentJson: autoDoc,
    });
    const combined = withOpinionEnglishOriginal(withAuto, {
      title: "Original English title",
      perex: "Original English perex",
      contentJson: englishDoc,
    });
    const row = article(combined);

    expect(getOpinionEnglishAutoTranslation(combined)?.title).toBe("Automatically translated title");
    expect(getOpinionEnglishOriginal(combined).title).toBe("Original English title");
    expect(getOpinionArticleDisplay(row, LOCALE_EN).title).toBe("Original English title");
    expect(getOpinionArticleDisplay(row, LOCALE_EN).content_json).toEqual(englishDoc);
  });
});

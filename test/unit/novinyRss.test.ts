import { describe, expect, it } from "vitest";

import { parseRssFeed } from "@/lib/noviny/rss";

describe("parseRssFeed", () => {
  it("parses rss items and deduplicates canonical urls", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <rss version="2.0">
        <channel>
          <title>Test feed</title>
          <item>
            <title>První článek</title>
            <link>https://example.com/a?utm_source=test</link>
            <description><![CDATA[<p>Krátký popis.</p>]]></description>
            <pubDate>Thu, 26 Jun 2026 10:00:00 GMT</pubDate>
          </item>
          <item>
            <title>Duplikát článku</title>
            <link>https://example.com/a</link>
            <description>Duplicitní odkaz.</description>
          </item>
        </channel>
      </rss>`;

    const result = parseRssFeed(xml, {
      sourceName: "Test",
      sourceLanguage: "cs",
      allowImages: false,
    });

    expect(result.feedTitle).toBe("Test feed");
    expect(result.articles).toHaveLength(1);
    expect(result.articles[0]?.canonicalUrl).toBe("https://example.com/a");
    expect(result.articles[0]?.title).toBe("První článek");
    expect(result.articles[0]?.perex).toBe("Krátký popis.");
  });
});

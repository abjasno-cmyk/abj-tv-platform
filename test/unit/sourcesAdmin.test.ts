import { describe, expect, it } from "vitest";

import {
  isValidYoutubeChannelUrl,
  normalizeYoutubeChannelUrl,
  parseSourceCreateInput,
  parseSourcePriority,
  parseSourceUpdateInput,
} from "@/lib/studio/sourcesAdmin";

describe("sourcesAdmin validation", () => {
  it("normalizes youtube URLs", () => {
    expect(normalizeYoutubeChannelUrl("https://www.youtube.com/@echopodcasty/  ")).toBe(
      "https://www.youtube.com/@echopodcasty",
    );
  });

  it("accepts handle, channel id and custom URLs", () => {
    expect(isValidYoutubeChannelUrl("https://www.youtube.com/@emko-ab")).toBe(true);
    expect(isValidYoutubeChannelUrl("https://www.youtube.com/channel/UCxxxxxxxxxxxxxxxxxxxxxx")).toBe(true);
    expect(isValidYoutubeChannelUrl("https://example.com/@foo")).toBe(false);
  });

  it("parses create input", () => {
    const parsed = parseSourceCreateInput({
      sourceName: "Echo Podcasty",
      channelUrl: "https://www.youtube.com/@echopodcasty",
      priority: "b",
    });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value.priority).toBe("B");
      expect(parsed.value.country).toBe("CZ");
      expect(parsed.value.language).toBe("cs");
    }
  });

  it("rejects invalid create input", () => {
    expect(parseSourceCreateInput({ sourceName: "", channelUrl: "x", priority: "A" }).ok).toBe(false);
    expect(parseSourceCreateInput({ sourceName: "Test", channelUrl: "https://foo.com", priority: "A" }).ok).toBe(false);
    expect(parseSourceCreateInput({ sourceName: "Test", channelUrl: "https://www.youtube.com/@x", priority: "Z" }).ok).toBe(
      false,
    );
  });

  it("parses update input and clears ids when URL changes", () => {
    const parsed = parseSourceUpdateInput({
      channelUrl: "https://www.youtube.com/@new-handle",
      active: false,
    });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value.channelUrl).toBe("https://www.youtube.com/@new-handle");
      expect(parsed.value.active).toBe(false);
    }
  });

  it("parses priority", () => {
    expect(parseSourcePriority("a")).toBe("A");
    expect(parseSourcePriority("x")).toBeNull();
  });
});

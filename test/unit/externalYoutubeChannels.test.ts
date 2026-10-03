import { describe, expect, it } from "vitest";

import {
  EXTERNAL_YOUTUBE_CHANNEL_URL,
  extractYoutubeHandle,
  externalYoutubeChannelUrl,
  isExternalYoutubeOnlyChannel,
  normalizeChannelName,
} from "@/lib/viewer/externalYoutubeChannels";

const MATCHING_URL = "https://www.youtube.com/@spoleksvobodneradio3681";

describe("normalizeChannelName", () => {
  it("strips diacritics, trims, and lowercases", () => {
    expect(normalizeChannelName("  Spolek Svobodné rádio  ")).toBe("spolek svobodne radio");
  });
});

describe("extractYoutubeHandle", () => {
  it("reads @handle from a channel url", () => {
    expect(extractYoutubeHandle(MATCHING_URL)).toBe("spoleksvobodneradio3681");
  });

  it("accepts a bare @handle", () => {
    expect(extractYoutubeHandle("@spoleksvobodneradio3681")).toBe("spoleksvobodneradio3681");
  });

  it("returns null when there is no handle", () => {
    expect(extractYoutubeHandle("https://www.youtube.com/channel/UC123")).toBeNull();
    expect(extractYoutubeHandle("")).toBeNull();
    expect(extractYoutubeHandle(null)).toBeNull();
  });
});

describe("isExternalYoutubeOnlyChannel", () => {
  it("matches Verox by canonical name", () => {
    expect(isExternalYoutubeOnlyChannel({ channelName: "Spolek Svobodné rádio" }, "verox")).toBe(true);
  });

  it("matches Verox by name without diacritics or extra spaces", () => {
    expect(
      isExternalYoutubeOnlyChannel({ channelName: "  spolek   svobodne   radio  " }, "verox"),
    ).toBe(true);
  });

  it("matches Verox by handle even when the display name differs", () => {
    expect(
      isExternalYoutubeOnlyChannel(
        { channelName: "Something Else", channelUrl: MATCHING_URL },
        "verox",
      ),
    ).toBe(true);
  });

  it("does not match other Verox channels", () => {
    expect(isExternalYoutubeOnlyChannel({ channelName: "Protiproud" }, "verox")).toBe(false);
    expect(isExternalYoutubeOnlyChannel({ channelName: "Spolek Svatopluk" }, "verox")).toBe(false);
    expect(isExternalYoutubeOnlyChannel({ channelName: "Rádio Universum" }, "verox")).toBe(false);
    expect(
      isExternalYoutubeOnlyChannel(
        { channelName: "Rádio Universum", channelUrl: "https://www.youtube.com/@radiouniversumcz" },
        "verox",
      ),
    ).toBe(false);
  });

  it("does not match other handles", () => {
    expect(
      isExternalYoutubeOnlyChannel(
        { channelUrl: "https://www.youtube.com/@ProtiproudTV" },
        "verox",
      ),
    ).toBe(false);
  });

  it("never matches on ProudX, even for this channel", () => {
    expect(
      isExternalYoutubeOnlyChannel(
        { channelName: "Spolek Svobodné rádio", channelUrl: MATCHING_URL },
        "proudx",
      ),
    ).toBe(false);
  });
});

describe("externalYoutubeChannelUrl", () => {
  it("returns the canonical @handle url", () => {
    expect(externalYoutubeChannelUrl()).toBe(EXTERNAL_YOUTUBE_CHANNEL_URL);
    expect(externalYoutubeChannelUrl({ channelUrl: null })).toBe(EXTERNAL_YOUTUBE_CHANNEL_URL);
  });

  it("keeps the channel's own youtube url when it already matches the handle", () => {
    const own = "https://www.youtube.com/@spoleksvobodneradio3681/videos";
    expect(externalYoutubeChannelUrl({ channelUrl: own })).toBe(own);
  });
});

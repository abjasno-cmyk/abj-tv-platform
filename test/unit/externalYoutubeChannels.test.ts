import { describe, expect, it } from "vitest";

import {
  EXTERNAL_YOUTUBE_CHANNEL_URL,
  extractYoutubeHandle,
  externalYoutubeChannelUrl,
  filterVeroxCatalogChannels,
  filterVeroxFeedVideos,
  filterVeroxProgramDays,
  isExternalYoutubeOnlyChannel,
  normalizeChannelName,
  youtubeWatchUrl,
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

describe("youtubeWatchUrl", () => {
  it("builds a YouTube watch url for the clicked video", () => {
    expect(youtubeWatchUrl("2JQ6DphibPA")).toBe("https://www.youtube.com/watch?v=2JQ6DphibPA");
  });
});

describe("filterVeroxCatalogChannels", () => {
  it("removes Spolek Svobodné rádio from Verox listings and keeps other channels", () => {
    const channels = [
      { channelName: "Spolek Svobodné rádio", channelUrl: MATCHING_URL },
      { channelName: "Protiproud", channelUrl: "https://www.youtube.com/@ProtiproudTV" },
    ];
    expect(filterVeroxCatalogChannels(channels, "verox").map((row) => row.channelName)).toEqual(["Protiproud"]);
    expect(filterVeroxCatalogChannels(channels, "proudx").map((row) => row.channelName)).toEqual([
      "Spolek Svobodné rádio",
      "Protiproud",
    ]);
  });
});

describe("filterVeroxFeedVideos", () => {
  it("drops this channel's videos from Verox feed lists", () => {
    const videos = [
      { video_id: "2JQ6DphibPA", channel: "Spolek Svobodné rádio" },
      { video_id: "other", channel: "XTV" },
    ];
    expect(filterVeroxFeedVideos(videos, "verox").map((row) => row.video_id)).toEqual(["other"]);
  });
});

describe("filterVeroxProgramDays", () => {
  it("strips this channel from the Verox program timeline", () => {
    const days = [
      {
        date: "2026-10-16",
        label: "Dnes",
        items: [
          { time: "10:00", title: "Studio Kladno", channelName: "Spolek Svobodné rádio", thumbnail: null, videoId: "2JQ6DphibPA", isABJ: false },
          { time: "11:00", title: "Jiný pořad", channelName: "XTV", thumbnail: null, videoId: "abc", isABJ: false },
        ],
      },
    ];
    expect(filterVeroxProgramDays(days, "verox")[0]?.items.map((item) => item.channelName)).toEqual(["XTV"]);
  });
});

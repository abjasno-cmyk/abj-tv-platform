import { describe, expect, it } from "vitest";
import {
  extractHandleFromChannelUrl,
  uploadsPlaylistIdFromChannelId,
} from "@/lib/youtubeChannelResolve";

describe("youtubeChannelResolve", () => {
  it("extracts @handle from channel URL", () => {
    expect(extractHandleFromChannelUrl("https://www.youtube.com/@Datarun_cz")).toBe("@Datarun_cz");
    expect(extractHandleFromChannelUrl("https://www.youtube.com/@emko-ab/videos")).toBe("@emko-ab");
  });

  it("returns null for channel-id URLs", () => {
    expect(extractHandleFromChannelUrl("https://www.youtube.com/channel/UC123")).toBeNull();
  });

  it("derives uploads playlist id from channel id", () => {
    expect(uploadsPlaylistIdFromChannelId("UC9si6gMYt2_5veSv9HVJVsQ")).toBe("UU9si6gMYt2_5veSv9HVJVsQ");
  });
});

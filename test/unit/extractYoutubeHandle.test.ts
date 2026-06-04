import { describe, it, expect } from "vitest";
import { extractYoutubeHandle } from "@/lib/buildPlaylist";

describe("extractYoutubeHandle", () => {
  it("extracts an @handle from a channel url", () => {
    expect(extractYoutubeHandle("https://www.youtube.com/@verox")).toBe("@verox");
  });

  it("extracts a handle even with a trailing path or query", () => {
    expect(extractYoutubeHandle("https://youtube.com/@verox/videos?x=1")).toBe("@verox");
  });

  it("trims surrounding whitespace before parsing", () => {
    expect(extractYoutubeHandle("   https://youtube.com/@verox   ")).toBe("@verox");
  });

  it("returns null for a channel-id style url (no @handle)", () => {
    expect(extractYoutubeHandle("https://www.youtube.com/channel/UC123")).toBeNull();
  });

  it("returns null for an empty or whitespace-only string", () => {
    expect(extractYoutubeHandle("")).toBeNull();
    expect(extractYoutubeHandle("   ")).toBeNull();
  });

  it("returns null for a non-url string", () => {
    expect(extractYoutubeHandle("not a url")).toBeNull();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/youtubeChannelResolve", () => ({
  resolveChannelIdsFromChannelUrl: vi.fn(),
}));

import { resolveChannelIdsFromChannelUrl } from "@/lib/youtubeChannelResolve";
import { resolveActiveSourceIdsFromChannelUrl } from "@/lib/fetchVideos";

const resolveMock = vi.mocked(resolveChannelIdsFromChannelUrl);

describe("resolveActiveSourceIdsFromChannelUrl", () => {
  beforeEach(() => {
    resolveMock.mockReset();
  });

  it("prefers IDs resolved from channel_url over stale DB values", async () => {
    resolveMock.mockResolvedValue({
      channelId: "UC_NEW",
      uploadsPlaylistId: "UU_NEW",
    });

    const update = vi.fn().mockReturnValue({ error: null });
    const supabase = {
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: update,
        }),
      }),
    };

    const result = await resolveActiveSourceIdsFromChannelUrl(
      supabase as never,
      {
        id: "src-1",
        source_name: "Datarun",
        channel_url: "https://www.youtube.com/@Datarun_cz",
        channel_id: "UC_STALE",
        uploads_playlist_id: "UU_STALE",
        priority: "B",
      },
      "yt-key"
    );

    expect(result.ids).toEqual({
      channelId: "UC_NEW",
      uploadsPlaylistId: "UU_NEW",
    });
    expect(result.changed).toBe(true);
    expect(update).toHaveBeenCalledWith("id", "src-1");
  });
});

import { describe, expect, it } from "vitest";

import { buildTranscriptStateMap } from "@/hooks/useTranscriptStates";

describe("buildTranscriptStateMap", () => {
  it("maps video ids to transcript states", () => {
    expect(
      buildTranscriptStateMap([
        { video_id: "abc123", transcript_state: "ready" },
        { video_id: "def456", transcript_state: "pending" },
        { video_id: null, transcript_state: "ready" },
        { video_id: "ghi789", transcript_state: "broken" },
      ]),
    ).toEqual({
      abc123: "ready",
      def456: "pending",
    });
  });
});

import { describe, expect, it } from "vitest";

import { buildWallTree } from "@/lib/wallThread";
import type { WallPost } from "@/lib/wallTypes";

function post(over: Partial<WallPost> & Pick<WallPost, "id">): WallPost {
  return {
    author_name: over.author_name ?? "User",
    body: over.body ?? "text",
    status: "approved",
    video_id: null,
    video_title: null,
    parent_id: null,
    likes_count: 0,
    reports_count: 0,
    created_at: "2026-06-01T10:00:00.000Z",
    updated_at: "2026-06-01T10:00:00.000Z",
    approved_at: null,
    approved_by: null,
    ...over,
  };
}

describe("buildWallTree", () => {
  it("nests replies under root posts", () => {
    const tree = buildWallTree(
      [
        post({ id: "root", author_name: "Alda" }),
        post({ id: "reply", parent_id: "root", author_name: "Rossi", created_at: "2026-06-01T11:00:00.000Z" }),
      ],
      "newest",
    );
    expect(tree).toHaveLength(1);
    expect(tree[0]?.replies.map((node) => node.id)).toEqual(["reply"]);
  });
});

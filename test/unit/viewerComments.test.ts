import { describe, expect, it } from "vitest";

import { buildCommentTree, sortCommentRoots } from "@/lib/viewer/comments";
import { isStaffCommentAuthor } from "@/lib/viewer/commentsStaff";

describe("buildCommentTree", () => {
  it("nests replies under parents and sorts pinned roots first", () => {
    const tree = buildCommentTree([
      {
        id: "b",
        userId: "u1",
        entityType: "video",
        entityId: "v1",
        parentId: null,
        body: "B",
        status: "published",
        isPinned: false,
        createdAt: "2026-01-02T10:00:00.000Z",
        updatedAt: "2026-01-02T10:00:00.000Z",
        authorName: "A",
        authorAvatarUrl: null,
        isStaffHighlight: false,
        canModerate: false,
        likeCount: 0,
        likedByMe: false,
      },
      {
        id: "a",
        userId: "u2",
        entityType: "video",
        entityId: "v1",
        parentId: null,
        body: "A pinned",
        status: "published",
        isPinned: true,
        createdAt: "2026-01-01T10:00:00.000Z",
        updatedAt: "2026-01-01T10:00:00.000Z",
        authorName: "B",
        authorAvatarUrl: null,
        isStaffHighlight: false,
        canModerate: false,
        likeCount: 3,
        likedByMe: false,
      },
      {
        id: "r1",
        userId: "u3",
        entityType: "video",
        entityId: "v1",
        parentId: "b",
        body: "reply",
        status: "published",
        isPinned: false,
        createdAt: "2026-01-02T11:00:00.000Z",
        updatedAt: "2026-01-02T11:00:00.000Z",
        authorName: "C",
        authorAvatarUrl: null,
        isStaffHighlight: false,
        canModerate: false,
        likeCount: 0,
        likedByMe: false,
      },
    ]);

    expect(tree.map((node) => node.id)).toEqual(["a", "b"]);
    expect(tree[1]?.replies[0]?.replyToAuthorName).toBe("A");
    expect(tree[1]?.replies.map((node) => node.id)).toEqual(["r1"]);
  });
});

describe("sortCommentRoots", () => {
  it("ranks popular roots by likes and replies", () => {
    const roots = sortCommentRoots(
      buildCommentTree([
        {
          id: "low",
          userId: "u1",
          entityType: "video",
          entityId: "v1",
          parentId: null,
          body: "low",
          status: "published",
          isPinned: false,
          createdAt: "2026-01-02T10:00:00.000Z",
          updatedAt: "2026-01-02T10:00:00.000Z",
          authorName: "A",
          authorAvatarUrl: null,
          isStaffHighlight: false,
          canModerate: false,
          likeCount: 1,
          likedByMe: false,
        },
        {
          id: "high",
          userId: "u2",
          entityType: "video",
          entityId: "v1",
          parentId: null,
          body: "high",
          status: "published",
          isPinned: false,
          createdAt: "2026-01-01T10:00:00.000Z",
          updatedAt: "2026-01-01T10:00:00.000Z",
          authorName: "B",
          authorAvatarUrl: null,
          isStaffHighlight: false,
          canModerate: false,
          likeCount: 10,
          likedByMe: false,
        },
      ]),
      "popular",
    );
    expect(roots.map((node) => node.id)).toEqual(["high", "low"]);
  });
});

describe("isStaffCommentAuthor", () => {
  it("marks allowlisted admin email as staff", () => {
    expect(isStaffCommentAuthor({ email: "abjasno@gmail.com", role: "viewer" })).toBe(true);
  });

  it("marks moderator roles as staff", () => {
    expect(isStaffCommentAuthor({ email: "user@example.com", role: "moderator" })).toBe(true);
  });
});

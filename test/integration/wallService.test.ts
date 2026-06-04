import { describe, it, expect, beforeEach, vi } from "vitest";

// ── Chainable Supabase mock ───────────────────────────────────────────────
// A minimal stand-in for the supabase-js query builder: chain methods return
// the builder; range/single/maybeSingle resolve, and the builder itself is
// thenable so `await query.in(...)` (count/head queries) works too. Results are
// configured per table via `h.tableData`.
const h = vi.hoisted(() => {
  const state: { tableData: Record<string, { data?: unknown; error?: unknown; count?: number }> } = {
    tableData: {},
  };
  function makeBuilder(result: { data?: unknown; error?: unknown; count?: number }) {
    const b: Record<string, unknown> = {};
    const chain = () => b;
    for (const m of ["select", "eq", "in", "gte", "lte", "order", "update", "insert", "limit"]) b[m] = chain;
    b.range = () => Promise.resolve(result);
    b.single = () => Promise.resolve(result);
    b.maybeSingle = () => Promise.resolve(result);
    b.then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject);
    return b;
  }
  const client = {
    from: (table: string) => makeBuilder(state.tableData[table] ?? { data: [], error: null, count: 0 }),
  };
  return { state, client };
});

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServiceClient: () => h.client,
  createSupabaseServerClient: async () => h.client,
  createSupabaseAnonServerClient: () => h.client,
}));

import {
  listPublicWallPosts,
  createWallPost,
  parseWallStatus,
  parseWallSort,
  WallServiceError,
} from "@/lib/wallService";
import type { WallIdentityMeta } from "@/lib/wallTypes";

function row(over: Record<string, unknown> = {}) {
  return {
    id: "post-1",
    author_name: "Pavel",
    author_email: null,
    body: "Dobrý pořad",
    status: "approved",
    video_id: null,
    parent_id: null,
    likes_count: 0,
    reports_count: 0,
    created_at: "2026-06-03T10:00:00.000Z",
    updated_at: "2026-06-03T10:00:00.000Z",
    approved_at: "2026-06-03T10:00:00.000Z",
    approved_by: "auto-moderation",
    ip_hash: null,
    user_agent_hash: null,
    ...over,
  };
}

const identity: WallIdentityMeta = { ipHash: "ip-hash", userAgentHash: "ua-hash", sessionHash: "sess-hash" };

beforeEach(() => {
  h.state.tableData = {};
  vi.stubEnv("WALL_AUTO_APPROVE", undefined);
});

describe("parseWallStatus / parseWallSort", () => {
  it("parses valid wall statuses and rejects junk", () => {
    expect(parseWallStatus("approved")).toBe("approved");
    expect(parseWallStatus("pending")).toBe("pending");
    expect(parseWallStatus("nonsense")).toBeNull();
    expect(parseWallStatus(undefined)).toBeNull();
  });
  it("parses sort with a safe default", () => {
    expect(parseWallSort("popular")).toBe("popular");
    expect(parseWallSort("newest")).toBe("newest");
    expect(parseWallSort("bogus")).toBe("newest");
    expect(parseWallSort(undefined)).toBe("newest");
  });
});

describe("listPublicWallPosts", () => {
  it("maps approved rows and computes hasMore from the total count", () => {
    h.state.tableData = {
      wall_posts: { data: [row({ id: "a" }), row({ id: "b" })], count: 5, error: null },
      videos: { data: [], error: null },
    };
    return listPublicWallPosts({ limit: 2, offset: 0 }).then((result) => {
      expect(result.posts.map((p) => p.id)).toEqual(["a", "b"]);
      expect(result.posts[0].status).toBe("approved");
      expect(result.limit).toBe(2);
      expect(result.hasMore).toBe(true); // 0 + 2 < 5
    });
  });

  it("hasMore is false when the page reaches the end", async () => {
    h.state.tableData = {
      wall_posts: { data: [row({ id: "a" })], count: 1, error: null },
      videos: { data: [], error: null },
    };
    const result = await listPublicWallPosts({ limit: 30, offset: 0 });
    expect(result.hasMore).toBe(false);
  });

  it("throws a WallServiceError when the query errors", async () => {
    h.state.tableData = { wall_posts: { data: null, error: { message: "boom" }, count: 0 } };
    await expect(listPublicWallPosts()).rejects.toBeInstanceOf(WallServiceError);
  });
});

describe("createWallPost", () => {
  it("rejects too-short author name with a 400", async () => {
    await expect(createWallPost({ authorName: "x", body: "dost dlouhý text" }, identity)).rejects.toMatchObject({
      status: 400,
    });
  });

  it("rejects too-short body with a 400", async () => {
    await expect(createWallPost({ authorName: "Pavel", body: "ok" }, identity)).rejects.toMatchObject({ status: 400 });
  });

  it("rejects an invalid email with a 400", async () => {
    await expect(
      createWallPost({ authorName: "Pavel", body: "dost dlouhý text", authorEmail: "not-an-email" }, identity),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("auto-approves a clean post and returns the inserted row", async () => {
    h.state.tableData = {
      // count=0 satisfies the create rate-limit checks; data is the inserted row.
      wall_posts: { data: row({ id: "new-post", body: "Skvělý díl, díky." }), count: 0, error: null },
    };
    const result = await createWallPost({ authorName: "Pavel", body: "Skvělý díl, díky." }, identity);
    expect(result.status).toBe("approved");
    expect(result.post.id).toBe("new-post");
    expect(result.moderationReasons).toEqual([]);
  });

  it("enforces the per-IP create rate limit (429)", async () => {
    h.state.tableData = { wall_posts: { data: [], count: 5, error: null } };
    await expect(createWallPost({ authorName: "Pavel", body: "dost dlouhý text" }, identity)).rejects.toMatchObject({
      status: 429,
    });
  });
});

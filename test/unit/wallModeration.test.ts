import { describe, it, expect, beforeEach, vi } from "vitest";
import { moderateWallPost } from "@/lib/wallModerationService";
import type { CreateWallPostInput } from "@/lib/wallTypes";

function post(body: string): CreateWallPostInput {
  return { authorName: "Tester", body };
}

beforeEach(() => {
  // Product default: clean posts auto-approve. Keep env unset for the default.
  vi.stubEnv("WALL_AUTO_APPROVE", undefined);
});

describe("moderateWallPost", () => {
  it("approves a clean post", () => {
    const result = moderateWallPost(post("Pěkný pořad, díky za přehled."));
    expect(result.status).toBe("approved");
    expect(result.reasons).toEqual([]);
  });

  it("rejects outright on strong blocklist content", () => {
    const result = moderateWallPost(post("ty nazi"));
    expect(result.status).toBe("rejected");
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it("holds vulgarities for moderation (pending)", () => {
    const result = moderateWallPost(post("ty debil"));
    expect(result.status).toBe("pending");
    expect(result.reasons).toContain("vulgarity");
  });

  it("holds spam keywords (pending)", () => {
    const result = moderateWallPost(post("nejlepší casino tady"));
    expect(result.status).toBe("pending");
    expect(result.reasons).toContain("spamová klíčová slova");
  });

  it("flags excessive links (3+) as pending", () => {
    const result = moderateWallPost(post("http://a.cz http://b.cz https://c.cz"));
    expect(result.status).toBe("pending");
    expect(result.reasons).toContain("nadměrné množství odkazů");
  });

  it("flags long character runs as pending", () => {
    const result = moderateWallPost(post("toooooooootální nářez")); // 8+ repeated 'o'
    expect(result.status).toBe("pending");
    expect(result.reasons).toContain("opakování znaků");
  });
});

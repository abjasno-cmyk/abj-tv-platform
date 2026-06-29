import { describe, expect, it } from "vitest";

import { buildAutoThankReply, buildCommentEngagementResponse, buildThankMessage } from "@/lib/viewer/autoThank";
import { buildCommentEngagementHref } from "@/lib/viewer/commentLinks";
import { detectCommentMood, pickVariant } from "@/lib/viewer/commentMood";

describe("commentMood", () => {
  it("detects angry, sad, positive and question moods", () => {
    expect(detectCommentMood("Proč je inflace tak vysoká?")).toBe("question");
    expect(detectCommentMood("To je naštvaná katastrofa!!!")).toBe("angry");
    expect(detectCommentMood("Jsem z toho smutný 😢")).toBe("sad");
    expect(detectCommentMood("Skvělý pořad, díky 👍")).toBe("positive");
    expect(detectCommentMood("Souhlasím s hostem.")).toBe("neutral");
  });

  it("picks stable variants for the same seed", () => {
    const pool = ["A", "B", "C"] as const;
    expect(pickVariant(pool, "seed-1")).toBe(pickVariant(pool, "seed-1"));
    expect(pickVariant(pool, "seed-2")).not.toBe(pickVariant(pool, "seed-1"));
  });
});

describe("autoThank", () => {
  it("uses mood-specific thank messages with emoji", () => {
    expect(buildThankMessage("Proč je inflace tak vysoká?")).toMatch(/otázku|ptáte/i);
    expect(buildThankMessage("Skvělý pořad, díky 👍")).toMatch(/👍|😊|🍀|✨/u);
    expect(buildAutoThankReply("Jsem z toho naštvaný!!!")).toMatch(/😔|😢|🙏/u);
  });

  it("varies replies for different comment ids", () => {
    const body = "Díky za pořad";
    const a = buildAutoThankReply(body, "comment-a");
    const b = buildAutoThankReply(body, "comment-b");
    expect(a).not.toBe(b);
  });

  it("uses a general thank message for neutral statements", () => {
    expect(buildThankMessage("Souhlasím s hostem.")).toMatch(/Díky|Děkujeme/i);
    expect(buildAutoThankReply("Souhlasím s hostem.", "id-1")).toMatch(/Díky|Děkujeme/i);
  });
});

describe("buildCommentEngagementHref", () => {
  it("builds video and opinion links", () => {
    expect(buildCommentEngagementHref("video", "abc123")).toBe("/videa/abc123#komentare");
    expect(buildCommentEngagementHref("opinion", "uuid-1", "muj-clanek")).toBe("/nazory/muj-clanek#komentare");
    expect(buildCommentEngagementHref("noviny_article", "article-1")).toBe("/noviny#noviny-article-article-1");
  });
});

describe("buildCommentEngagementResponse", () => {
  it("suggests sharing only for top-level comments", () => {
    expect(buildCommentEngagementResponse("Díky za pořad", null).shareSuggested).toBe(true);
    expect(buildCommentEngagementResponse("Souhlasím", "parent-id").shareSuggested).toBe(false);
  });
});

import { describe, expect, it } from "vitest";

import { buildAutoThankReply, buildCommentEngagementResponse, buildThankMessage } from "@/lib/viewer/autoThank";
import { buildCommentEngagementHref } from "@/lib/viewer/commentLinks";

describe("autoThank", () => {
  it("uses a warmer question-specific thank message", () => {
    expect(buildThankMessage("Proč je inflace tak vysoká?")).toContain("otázku");
    expect(buildAutoThankReply("Proč je inflace tak vysoká?")).toContain("otázku");
  });

  it("uses a general thank message for statements", () => {
    expect(buildThankMessage("Skvělý pořad, díky.")).toContain("diskuse");
    expect(buildAutoThankReply("Skvělý pořad, díky.")).toContain("Děkujeme");
  });
});

describe("buildCommentEngagementHref", () => {
  it("builds video and opinion links", () => {
    expect(buildCommentEngagementHref("video", "abc123")).toBe("/videa/abc123#komentare");
    expect(buildCommentEngagementHref("opinion", "uuid-1", "muj-clanek")).toBe("/nazory/muj-clanek#komentare");
  });
});

describe("buildCommentEngagementResponse", () => {
  it("suggests sharing only for top-level comments", () => {
    expect(buildCommentEngagementResponse("Díky za pořad", null).shareSuggested).toBe(true);
    expect(buildCommentEngagementResponse("Souhlasím", "parent-id").shareSuggested).toBe(false);
  });
});

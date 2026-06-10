import { describe, expect, it } from "vitest";

import { isLikelyCommentQuestion } from "@/lib/viewer/commentQuestion";

describe("isLikelyCommentQuestion", () => {
  it("detects explicit question marks", () => {
    expect(isLikelyCommentQuestion("Co si o tom myslíte?")).toBe(true);
    expect(isLikelyCommentQuestion("Díky za vysvětlení")).toBe(false);
  });

  it("detects Czech question starters without a question mark", () => {
    expect(isLikelyCommentQuestion("Proč to tak je")).toBe(true);
    expect(isLikelyCommentQuestion("Jak to funguje v praxi")).toBe(true);
    expect(isLikelyCommentQuestion("Skvělý přenos, díky")).toBe(false);
  });

  it("ignores empty input", () => {
    expect(isLikelyCommentQuestion("   ")).toBe(false);
  });
});

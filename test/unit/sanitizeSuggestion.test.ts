import { describe, expect, it } from "vitest";

import { sanitizeSuggestionText } from "@/lib/kanaly/sanitizeSuggestion";

describe("sanitizeSuggestionText", () => {
  it("removes HTML tags", () => {
    expect(sanitizeSuggestionText('<script>alert("x")</script>Bezpečný text')).toBe('alert("x")Bezpečný text');
  });

  it("removes control characters", () => {
    expect(sanitizeSuggestionText("Kanál\u0000test")).toBe("Kanáltest");
  });
});

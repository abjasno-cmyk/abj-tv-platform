import { describe, expect, it } from "vitest";

import { authorInitials, formatRelativeCommentTime } from "@/lib/viewer/commentTime";

describe("formatRelativeCommentTime", () => {
  const now = Date.parse("2026-06-06T12:00:00.000Z");

  it("formats minutes and hours ago in Czech", () => {
    expect(formatRelativeCommentTime("2026-06-06T11:58:00.000Z", now)).toBe("Před 2 minutami");
    expect(formatRelativeCommentTime("2026-06-06T10:00:00.000Z", now)).toBe("Před 2 hodinami");
  });
});

describe("authorInitials", () => {
  it("uses first letters of first and last name", () => {
    expect(authorInitials("Petr Špergl")).toBe("PŠ");
  });
});

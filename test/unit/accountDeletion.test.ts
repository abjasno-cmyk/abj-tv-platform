import { describe, expect, it } from "vitest";

import {
  ACCOUNT_DELETE_CONFIRMATION,
  isStaffProfileRole,
} from "@/lib/viewer/accountDeletion";

describe("accountDeletion", () => {
  it("requires the fixed confirmation phrase", () => {
    expect(ACCOUNT_DELETE_CONFIRMATION).toBe("SMAZAT");
  });

  it("treats editorial roles as staff-only deletion", () => {
    expect(isStaffProfileRole("viewer")).toBe(false);
    expect(isStaffProfileRole("author")).toBe(false);
    expect(isStaffProfileRole("admin")).toBe(true);
    expect(isStaffProfileRole("moderator")).toBe(true);
    expect(isStaffProfileRole("editor")).toBe(true);
  });
});

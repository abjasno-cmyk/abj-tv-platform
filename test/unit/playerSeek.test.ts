import { describe, it, expect } from "vitest";
import { findSeekSecondsByTextQuery } from "@/lib/playerSeek";
import type { ContextClaim } from "@/lib/contextLayerApi";

function claim(over: Partial<ContextClaim> & Pick<ContextClaim, "timeSeconds" | "claimText">): ContextClaim {
  return {
    id: `c-${over.timeSeconds}`,
    timestamp: "00:00",
    contextText: over.contextText ?? "",
    status: "supported",
    sourceQualitySummary: null,
    sources: [],
    ...over,
  };
}

describe("findSeekSecondsByTextQuery", () => {
  it("finds a claim when all query tokens match", () => {
    const claims = [
      claim({ timeSeconds: 10, claimText: "Inflace v Česku roste", contextText: "" }),
      claim({ timeSeconds: 120, claimText: "Rozhovor o zahraniční politice", contextText: "" }),
    ];
    expect(findSeekSecondsByTextQuery(claims, "zahraniční politice")).toBe(120);
  });

  it("returns null when nothing matches", () => {
    const claims = [claim({ timeSeconds: 5, claimText: "Krátká zpráva", contextText: "" })];
    expect(findSeekSecondsByTextQuery(claims, "neexistující téma")).toBeNull();
  });
});

import { describe, expect, it } from "vitest";

import {
  cleanVideoDescriptionText,
  resolveVideaCardSummary,
  summarizeVideoDescription,
} from "@/lib/videoDescriptionSummary";

describe("summarizeVideoDescription", () => {
  it("returns the first few meaningful sentences", () => {
    const description =
      "První věta popisuje hlavní téma videa a vysvětluje kontext celého pořadu. " +
      "Druhá věta rozvíjí důležité body a přidává konkrétní detaily k události. " +
      "Třetí věta shrnuje, proč by to diváky mělo zajímat a co sledovat dál. " +
      "Čtvrtá věta už by se do karty neměla vejít podle limitu vět.";
    const summary = summarizeVideoDescription(description, 3);
    expect(summary).toContain("První věta");
    expect(summary).toContain("Druhá věta");
    expect(summary).toContain("Třetí věta");
    expect(summary).not.toContain("Čtvrtá věta");
  });

  it("strips urls and hashtags", () => {
    const cleaned = cleanVideoDescriptionText("Téma videa. https://example.com #verox #news");
    expect(cleaned).toBe("Téma videa.");
  });
});

describe("resolveVideaCardSummary", () => {
  it("prefers editorial tldr over description", () => {
    expect(
      resolveVideaCardSummary({
        tldr: "Krátký redakční souhrn.",
        description: "Dlouhý popis z YouTube kanálu s mnoha detaily.",
      }),
    ).toBe("Krátký redakční souhrn.");
  });

  it("falls back to summarized description", () => {
    const summary = resolveVideaCardSummary({
      description:
        "Moderátoři rozebírají aktuální politickou situaci a její dopady na občany v České republice. " +
        "Hosté diskutují o ekonomických dopadech a možných scénářích vývoje v následujících týdnech.",
    });
    expect(summary.length).toBeGreaterThan(40);
  });
});

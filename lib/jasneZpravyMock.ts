import type { JasneZpravyBundle, JasneZpravyCategory, JasneZpravyItem } from "@/lib/jasneZpravyTypes";

const NOW_ISO = "2026-05-08T13:00:00+02:00";

function createSources(itemId: string, count: number) {
  return Array.from({ length: count }).map((_, index) => ({
    id: `${itemId}-source-${index + 1}`,
    title: `Zdroj ${index + 1} k tématu ${itemId}`,
    sourceName: index % 2 === 0 ? "ČTK" : "Veřejný registr",
    sourceUrl: index % 4 === 0 ? null : `https://example.org/${itemId}/source-${index + 1}`,
    publishedAt: NOW_ISO,
    sourceType: index % 2 === 0 ? "newswire" : "official",
    quoteOrExcerpt:
      index % 3 === 0 ? "Stručný výňatek z relevantního zdroje k ověření tvrzení." : null,
  }));
}

function createItem(category: JasneZpravyCategory, rank: number): JasneZpravyItem {
  const baseSlug = `${category}-${rank}`;
  const sourceCount = category === "curiosity" ? 2 : category === "domestic" ? 4 : 5;
  return {
    id: `mock-${baseSlug}`,
    editionId: "mock-edition-1",
    category,
    rank,
    slug: baseSlug,
    headline:
      category === "domestic"
        ? `Domácí přehled ${rank}: klíčové téma dne`
        : category === "foreign"
          ? `Zahraniční přehled ${rank}: mezinárodní vývoj`
          : "Kuriozita dne: nečekaný detail ze světa",
    shortHeadline: null,
    lead:
      category === "curiosity"
        ? "Odlehčený, ale věcný závěr dnešního vydání."
        : "Krátký souhrn ověřených informací bez zbytečné mlhy.",
    body:
      "První odstavec shrnuje hlavní skutečnosti.\n\nDruhý odstavec doplňuje kontext a návaznosti.\n\nTřetí odstavec uvádí, co je prakticky důležité sledovat dál.",
    whyItMatters:
      category === "curiosity" ? null : "Téma má přímý dopad na veřejnou debatu a rozhodování.",
    whatToWatch:
      category === "curiosity" ? "Sledujte další potvrzení detailů během dne." : "Další vývoj očekáváme během odpoledne.",
    sourceCount,
    status: "published",
    sources: createSources(`mock-${baseSlug}`, sourceCount),
  };
}

export function createMockJasneZpravyBundle(): JasneZpravyBundle {
  const domestic = Array.from({ length: 10 }).map((_, index) => createItem("domestic", index + 1));
  const foreign = Array.from({ length: 10 }).map((_, index) => createItem("foreign", index + 1));
  const curiosity = [createItem("curiosity", 1)];

  return {
    edition: {
      id: "mock-edition-1",
      type: "noon",
      slug: "mock-poledni-vydani",
      title: "Jasné zprávy",
      subtitle: "Dnešní přehled bez zbytečné mlhy.",
      summary: "Modelové vydání pro fallback a test UI, pokud ještě nejsou dostupná produkční data.",
      generatedAt: NOW_ISO,
      publishedAt: NOW_ISO,
    },
    items: [...domestic, ...foreign, ...curiosity],
  };
}


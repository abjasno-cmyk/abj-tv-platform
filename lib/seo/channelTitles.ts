function stripChannelNoise(channelName: string): string {
  return channelName
    .replace(/\s*[-–|]\s*verox\s*$/i, "")
    .replace(/\s*\|\s*.*$/, "")
    .trim();
}

function clampMetaDescription(value: string, max = 160): string {
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (trimmed.length <= max) return trimmed;
  const slice = trimmed.slice(0, max - 1);
  const lastSpace = slice.lastIndexOf(" ");
  if (lastSpace > max * 0.6) {
    return `${slice.slice(0, lastSpace).trim()}…`;
  }
  return `${slice.trim()}…`;
}

function pragueDateKey(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Prague",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (!year || !month || !day) return null;
  return `${year}-${month}-${day}`;
}

function isPublishedTodayPrague(iso: string | null | undefined): boolean {
  const publishedKey = pragueDateKey(iso);
  if (!publishedKey) return false;
  return publishedKey === pragueDateKey(new Date().toISOString());
}

function isPublishedWithinDays(iso: string | null | undefined, days: number): boolean {
  if (!iso) return false;
  const published = new Date(iso);
  if (Number.isNaN(published.getTime())) return false;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return published.getTime() >= cutoff;
}

export function buildChannelSeoTitle(channelName: string, latestPublishedAt: string | null): string {
  const channel = stripChannelNoise(channelName);
  if (!channel) return "Kanál | Verox";

  if (isPublishedTodayPrague(latestPublishedAt)) {
    return `${channel} dnes | Verox`;
  }

  if (isPublishedWithinDays(latestPublishedAt, 7)) {
    return `${channel} nové video | Verox`;
  }

  if (/posledn[ií]\s*d[ií]l/i.test(channel)) {
    return `${channel} | Verox`;
  }

  return `${channel} videa a rozhovory | Verox`;
}

export function buildChannelMetaDescription(channelName: string, latestVideoTitle: string | null): string {
  const channel = stripChannelNoise(channelName);
  if (!channel) {
    return clampMetaDescription(
      "Sledujte české a slovenské kanály na Verox.cz. Nová videa, rozhovory a živé vysílání na jednom místě.",
    );
  }

  if (latestVideoTitle?.trim()) {
    return clampMetaDescription(
      `Sledujte kanál ${channel} na Verox.cz. Nejnovější video: ${latestVideoTitle.trim()}. Další rozhovory, komentáře a videa z kanálu ${channel} na jednom místě.`,
    );
  }

  return clampMetaDescription(
    `Sledujte kanál ${channel} na Verox.cz. Nová videa, rozhovory, komentáře a další pořady z kanálu ${channel} na jednom místě.`,
  );
}

export function buildChannelIntro(channelName: string): string {
  const channel = stripChannelNoise(channelName);
  if (!channel) {
    return "Sledujte české a slovenské kanály na Verox.cz. Videa, rozhovory a živé vysílání na jednom místě.";
  }

  return `Sledujte kanál ${channel} na Verox.cz. Najdete zde nejnovější videa, rozhovory a komentáře z kanálu ${channel} — přehledně na jednom místě.`;
}

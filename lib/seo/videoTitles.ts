const TOPIC_KEYWORDS = [
  "zdravotnictví",
  "zdravotnictvi",
  "důchody",
  "duchody",
  "ekonomika",
  "Ukrajina",
  "ukrajina",
  "EU",
  "evropská unie",
  "svoboda slova",
  "energie",
  "inflace",
] as const;

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function stripChannelNoise(channelName: string): string {
  return channelName
    .replace(/\s*[-–|]\s*verox\s*$/i, "")
    .replace(/\s*\|\s*.*$/, "")
    .trim();
}

function extractLeadingName(title: string): string | null {
  const cleaned = title
    .replace(/^(rozhovor|video|novy|nové|dnes|posledni|poslední)\s+/i, "")
    .replace(/\s*[-–|:]\s*.+$/, "")
    .trim();

  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;
  if (words.length === 1) return words[0] ?? null;
  if (words.length === 2) return `${words[0]} ${words[1]}`;
  return words.slice(0, 2).join(" ");
}

function extractTopicKeyword(title: string): string | null {
  const haystack = normalize(title).toLowerCase();
  for (const keyword of TOPIC_KEYWORDS) {
    if (haystack.includes(normalize(keyword).toLowerCase())) {
      return keyword.charAt(0).toUpperCase() + keyword.slice(1);
    }
  }
  return null;
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

export function buildVideoSeoTitle(title: string, channelName: string): string {
  const normalizedTitle = title.trim();
  const channel = stripChannelNoise(channelName);
  const haystack = `${normalizedTitle} ${channel}`.toLowerCase();

  if (/posledn[ií]\s*d[ií]l/.test(haystack) && channel) {
    return `${channel} poslední díl | Verox`;
  }

  if (/\bdnes\b/i.test(haystack) && channel) {
    const label = channel.replace(/\s*dnes\s*/i, "").trim() || channel;
    return `${label} dnes | Verox`;
  }

  if (/nov[eý]\s+video|nov[eý]\s+d[ií]l|nov[eý]\s+pořad/.test(haystack) && channel) {
    if (/rozhovor/.test(haystack)) {
      const person = extractLeadingName(normalizedTitle) || channel;
      return `${person} nový rozhovor | Verox`;
    }
    return `${channel} nové video | Verox`;
  }

  if (/rozhovor/.test(haystack)) {
    const person = extractLeadingName(normalizedTitle) || channel;
    if (person) return `${person} nový rozhovor | Verox`;
  }

  const topic = extractTopicKeyword(normalizedTitle);
  if (topic) {
    const person = extractLeadingName(normalizedTitle) || channel;
    if (person) return `${person} ${topic} video | Verox`;
  }

  if (normalizedTitle && channel) {
    return `${normalizedTitle} | ${channel} | Verox`;
  }

  return `${normalizedTitle || channel || "Video"} | Verox`;
}

export function buildVideoMetaDescription(title: string, channelName: string): string {
  const normalizedTitle = title.trim();
  const channel = stripChannelNoise(channelName);
  const person = extractLeadingName(normalizedTitle);

  if (person && channel) {
    return clampMetaDescription(
      `Nové video s ${person} na kanálu ${channel} na Verox.cz. Sledujte aktuální rozhovory, komentáře a další české a slovenské pořady na jednom místě.`,
    );
  }

  if (channel) {
    return clampMetaDescription(
      `Nové video na kanálu ${channel} na Verox.cz. Sledujte aktuální rozhovory, komentáře a další české a slovenské pořady na jednom místě.`,
    );
  }

  if (normalizedTitle) {
    return clampMetaDescription(
      `Sledujte ${normalizedTitle} na Verox.cz. Česká a slovenská videa, komentáře, rozhovory a živé vysílání na jednom místě.`,
    );
  }

  return clampMetaDescription(
    "Sledujte nové video na Verox.cz. Česká a slovenská videa, komentáře, rozhovory a živé vysílání na jednom místě.",
  );
}

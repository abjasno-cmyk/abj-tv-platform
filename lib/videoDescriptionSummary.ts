const URL_PATTERN = /https?:\/\/\S+|www\.\S+/gi;
const HASHTAG_PATTERN = /#\S+/g;
const SENTENCE_SPLIT =
  /(?<=[.!?…])\s+(?=[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ0-9"„«(])/u;

export function cleanVideoDescriptionText(description: string): string {
  return description
    .replace(/\r\n/g, "\n")
    .replace(URL_PATTERN, "")
    .replace(HASHTAG_PATTERN, "")
    .replace(/\n+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function summarizeVideoDescription(description: string, maxSentences = 3): string {
  const cleaned = cleanVideoDescriptionText(description);
  if (!cleaned) return "";

  const sentences = cleaned
    .split(SENTENCE_SPLIT)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 35);

  if (sentences.length > 0) {
    return sentences.slice(0, maxSentences).join(" ");
  }

  if (cleaned.length <= 320) return cleaned;

  const slice = cleaned.slice(0, 320);
  const lastSpace = slice.lastIndexOf(" ");
  const cut = lastSpace > 120 ? slice.slice(0, lastSpace) : slice;
  return `${cut.trim()}…`;
}

export type VideoSummaryInput = {
  tldr?: string;
  context?: string;
  impact?: string;
  description?: string;
};

/** Card copy for /videa: editorial TLDR first, else a few sentences from the YouTube description. */
export function resolveVideaCardSummary(video: VideoSummaryInput): string {
  const tldr = video.tldr?.trim();
  if (tldr) return tldr;

  const description = video.description?.trim();
  if (description) {
    const fromDescription = summarizeVideoDescription(description);
    if (fromDescription) return fromDescription;
  }

  const context = video.context?.trim();
  if (context) {
    const fromContext = summarizeVideoDescription(context);
    if (fromContext) return fromContext;
  }

  const impact = video.impact?.trim();
  if (impact) return impact;

  return "";
}

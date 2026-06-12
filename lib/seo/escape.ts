export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function splitTranscriptParagraphs(text: string): string[] {
  return text
    .split(/\n\n+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export const TRANSCRIPT_SSR_CHAR_LIMIT = 28_000;

export function truncateTranscriptForSsr(text: string): {
  visibleText: string;
  truncated: boolean;
  totalChars: number;
} {
  const normalized = text.trim();
  if (normalized.length <= TRANSCRIPT_SSR_CHAR_LIMIT) {
    return { visibleText: normalized, truncated: false, totalChars: normalized.length };
  }

  let cut = normalized.slice(0, TRANSCRIPT_SSR_CHAR_LIMIT);
  const lastBreak = cut.lastIndexOf("\n\n");
  if (lastBreak > TRANSCRIPT_SSR_CHAR_LIMIT * 0.6) {
    cut = cut.slice(0, lastBreak);
  }

  return {
    visibleText: cut.trim(),
    truncated: true,
    totalChars: normalized.length,
  };
}

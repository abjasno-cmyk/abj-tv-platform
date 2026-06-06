type TipTapNode = {
  type?: string;
  text?: string;
  content?: TipTapNode[];
};

export function extractPlainTextFromTipTapJson(content: unknown): string {
  if (!content || typeof content !== "object") return "";

  const root = content as TipTapNode;
  const chunks: string[] = [];

  const walk = (node: TipTapNode) => {
    if (typeof node.text === "string" && node.text.trim().length > 0) {
      chunks.push(node.text.trim());
    }
    for (const child of node.content ?? []) {
      walk(child);
    }
  };

  walk(root);
  return chunks.join(" ");
}

export function estimateReadingTimeMinutes(text: string, wordsPerMinute = 200): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  if (words === 0) return 1;
  return Math.max(1, Math.ceil(words / wordsPerMinute));
}

export function estimateReadingTimeFromContentJson(
  contentJson: Record<string, unknown> | null | undefined,
  extraText = "",
): number {
  const plainText = [extractPlainTextFromTipTapJson(contentJson), extraText].filter(Boolean).join(" ");
  return estimateReadingTimeMinutes(plainText);
}

export function buildAutoSeoDescription(perex: string, title: string, maxLength = 160): string {
  const source = perex.trim() || title.trim();
  if (!source) return "";
  if (source.length <= maxLength) return source;
  return `${source.slice(0, maxLength - 1).trimEnd()}…`;
}

export function buildAutoSeoTitle(title: string, suffix = "Názory"): string {
  const trimmed = title.trim();
  if (!trimmed) return suffix;
  return `${trimmed} — ${suffix}`;
}

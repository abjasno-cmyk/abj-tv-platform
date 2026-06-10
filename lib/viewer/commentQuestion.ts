const QUESTION_FIRST_WORDS = new Set([
  "co",
  "jak",
  "proč",
  "proc",
  "kde",
  "kdy",
  "kdo",
  "který",
  "ktery",
  "která",
  "ktera",
  "kteří",
  "kteri",
  "kolik",
  "může",
  "muze",
  "můžete",
  "muzete",
  "můžu",
  "muzu",
  "existuje",
  "znamená",
  "znamena",
]);

function firstToken(body: string): string {
  const match = body.trim().match(/^[^\s]+/);
  if (!match) return "";
  return match[0]
    .toLowerCase()
    .replace(/^[^\p{L}\p{N}]+/u, "")
    .replace(/[^\p{L}\p{N}]+$/u, "");
}

export function isLikelyCommentQuestion(body: string): boolean {
  const trimmed = body.trim();
  if (!trimmed) return false;
  if (trimmed.includes("?")) return true;

  const first = firstToken(trimmed);
  if (QUESTION_FIRST_WORDS.has(first)) return true;

  const lower = trimmed.toLowerCase();
  return lower.startsWith("je možné") || lower.startsWith("je mozne");
}

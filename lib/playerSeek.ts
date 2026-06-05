import type { ContextClaim } from "@/lib/contextLayerApi";

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Najde první pasáž v kontextových blocích, která odpovídá dotazu uživatele. */
export function findSeekSecondsByTextQuery(claims: ContextClaim[], query: string): number | null {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return null;

  const tokens = normalizedQuery.split(/\s+/).filter((token) => token.length >= 2);
  if (tokens.length === 0) return null;

  for (const claim of claims) {
    const haystack = normalizeSearchText(`${claim.claimText} ${claim.contextText}`);
    const matchesAll = tokens.every((token) => haystack.includes(token));
    if (matchesAll) return claim.timeSeconds;
  }

  for (const claim of claims) {
    const haystack = normalizeSearchText(`${claim.claimText} ${claim.contextText}`);
    if (haystack.includes(normalizedQuery)) return claim.timeSeconds;
  }

  return null;
}

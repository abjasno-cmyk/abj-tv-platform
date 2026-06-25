import "server-only";

const translationCache = new Map<string, string | null>();

export async function translateTextToCzech(text: string): Promise<string | null> {
  const input = text.trim();
  if (!input) return null;
  if (translationCache.has(input)) return translationCache.get(input) ?? null;

  try {
    const endpoint = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=cs&dt=t&q=${encodeURIComponent(
      input,
    )}`;
    const response = await fetch(endpoint, {
      method: "GET",
      cache: "force-cache",
      headers: {
        Accept: "application/json,text/plain,*/*",
      },
    });
    if (!response.ok) {
      translationCache.set(input, null);
      return null;
    }
    const payload = (await response.json()) as unknown;
    if (!Array.isArray(payload) || !Array.isArray(payload[0])) {
      translationCache.set(input, null);
      return null;
    }

    const merged = (payload[0] as unknown[])
      .map((row) => (Array.isArray(row) ? String(row[0] ?? "") : ""))
      .join("")
      .trim();
    const result = merged.length > 0 ? merged : null;
    translationCache.set(input, result);
    return result;
  } catch {
    translationCache.set(input, null);
    return null;
  }
}

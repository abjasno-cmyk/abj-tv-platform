import "server-only";

const translationCache = new Map<string, string | null>();
const DEFAULT_TRANSLATION_TIMEOUT_MS = 2500;

export async function translateTextToCzech(text: string, maxLength = 2400): Promise<string | null> {
  const input = text.trim().slice(0, maxLength);
  if (!input) return null;
  if (translationCache.has(input)) return translationCache.get(input) ?? null;

  const timeoutMs = Number(process.env.NOVINY_TRANSLATION_TIMEOUT_MS ?? DEFAULT_TRANSLATION_TIMEOUT_MS);
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : DEFAULT_TRANSLATION_TIMEOUT_MS,
  );

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
      signal: controller.signal,
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

    const translated = (payload[0] as unknown[])
      .map((row) => (Array.isArray(row) ? String(row[0] ?? "") : ""))
      .join("")
      .trim();
    const result = translated.length > 0 ? translated : null;
    translationCache.set(input, result);
    return result;
  } catch {
    translationCache.set(input, null);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

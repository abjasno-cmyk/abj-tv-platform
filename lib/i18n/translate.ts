import "server-only";

const translationCache = new Map<string, string | null>();
const DEFAULT_TRANSLATION_TIMEOUT_MS = 2000;

export async function translateText(
  text: string | null | undefined,
  targetLanguage: "en",
  maxLength = 1200,
): Promise<string | null> {
  const input = text?.trim().slice(0, maxLength) ?? "";
  if (!input) return null;

  const cacheKey = `${targetLanguage}:${input}`;
  if (translationCache.has(cacheKey)) return translationCache.get(cacheKey) ?? null;

  const timeoutMs = Number(process.env.VEROX_I18N_TRANSLATION_TIMEOUT_MS ?? DEFAULT_TRANSLATION_TIMEOUT_MS);
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : DEFAULT_TRANSLATION_TIMEOUT_MS,
  );

  try {
    const endpoint = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLanguage}&dt=t&q=${encodeURIComponent(
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
      translationCache.set(cacheKey, null);
      return null;
    }

    const payload = (await response.json()) as unknown;
    if (!Array.isArray(payload) || !Array.isArray(payload[0])) {
      translationCache.set(cacheKey, null);
      return null;
    }

    const translated = (payload[0] as unknown[])
      .map((row) => (Array.isArray(row) ? String(row[0] ?? "") : ""))
      .join("")
      .trim();
    const result = translated.length > 0 ? translated : null;
    translationCache.set(cacheKey, result);
    return result;
  } catch {
    translationCache.set(cacheKey, null);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

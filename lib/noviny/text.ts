const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  aacute: "á",
  Aacute: "Á",
  cacute: "ć",
  Cacute: "Ć",
  ccaron: "č",
  Ccaron: "Č",
  dcaron: "ď",
  Dcaron: "Ď",
  eacute: "é",
  Eacute: "É",
  ecaron: "ě",
  Ecaron: "Ě",
  iacute: "í",
  Iacute: "Í",
  lcaron: "ľ",
  Lcaron: "Ľ",
  ncaron: "ň",
  Ncaron: "Ň",
  oacute: "ó",
  Oacute: "Ó",
  rcaron: "ř",
  Rcaron: "Ř",
  scaron: "š",
  Scaron: "Š",
  tcaron: "ť",
  Tcaron: "Ť",
  uacute: "ú",
  Uacute: "Ú",
  uring: "ů",
  Uring: "Ů",
  yacute: "ý",
  Yacute: "Ý",
  zcaron: "ž",
  Zcaron: "Ž",
};

function decodeNumericEntity(input: string, base: number): string {
  const parsed = Number.parseInt(input, base);
  if (!Number.isFinite(parsed)) return "";
  if (parsed <= 0 || parsed > 0x10ffff) return "";
  try {
    return String.fromCodePoint(parsed);
  } catch {
    return "";
  }
}

export function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-fA-F]+);/g, (_match, hex) => decodeNumericEntity(hex, 16))
    .replace(/&#([0-9]+);/g, (_match, dec) => decodeNumericEntity(dec, 10))
    .replace(/&([a-zA-Z][a-zA-Z0-9]+);/g, (match, name) => NAMED_ENTITIES[name] ?? match);
}

export function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function stripHtmlToText(value: string): string {
  const withoutTags = value
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");
  return normalizeWhitespace(decodeHtmlEntities(withoutTags));
}

const TRACKING_PARAM_PREFIXES = ["utm_", "fbclid", "gclid", "mc_", "ref", "source"];

function isTrackingParam(key: string): boolean {
  const normalized = key.trim().toLowerCase();
  return TRACKING_PARAM_PREFIXES.some((prefix) => normalized === prefix || normalized.startsWith(prefix));
}

export function normalizeExternalUrl(rawUrl: string): string | null {
  const input = rawUrl.trim();
  if (!input) return null;

  try {
    const parsed = new URL(input);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }

    parsed.hash = "";
    parsed.host = parsed.host.toLowerCase();

    const nextParams = new URLSearchParams();
    for (const [key, value] of parsed.searchParams.entries()) {
      if (isTrackingParam(key)) continue;
      nextParams.append(key, value);
    }
    parsed.search = nextParams.toString() ? `?${nextParams.toString()}` : "";

    let normalizedPath = parsed.pathname;
    if (normalizedPath !== "/" && normalizedPath.endsWith("/")) {
      normalizedPath = normalizedPath.replace(/\/+$/, "");
    }
    parsed.pathname = normalizedPath || "/";

    return parsed.toString();
  } catch {
    return null;
  }
}

export function inferSourceSlug(name: string): string {
  const normalized = name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "zdroj";
}

const DEFAULT_REPLIT_BASE_URL = "https://attached-assets-abjasno.replit.app";
const PROGRAM_PATH_SUFFIX = "/program";

function sanitizeEnvValue(value?: string): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  const equalsIdx = trimmed.indexOf("=");
  const maybeAssigned =
    equalsIdx > 0 && /^[A-Z0-9_]+$/.test(trimmed.slice(0, equalsIdx))
      ? trimmed.slice(equalsIdx + 1).trim()
      : trimmed;
  if (
    (maybeAssigned.startsWith('"') && maybeAssigned.endsWith('"')) ||
    (maybeAssigned.startsWith("'") && maybeAssigned.endsWith("'"))
  ) {
    return maybeAssigned.slice(1, -1).trim();
  }
  return maybeAssigned;
}

function normalizeUrl(url: URL): string {
  url.search = "";
  url.hash = "";
  const pathname = url.pathname.replace(/\/+$/, "");
  url.pathname = pathname || "/";
  return url.toString();
}

function pushUnique(target: string[], seen: Set<string>, candidate: string | null | undefined) {
  if (!candidate) return;
  const normalized = candidate.trim();
  if (!normalized || seen.has(normalized)) return;
  seen.add(normalized);
  target.push(normalized);
}

function deriveBaseUrlFromProgramFeed(programFeedUrl: string): string | null {
  try {
    const parsed = new URL(programFeedUrl);
    let path = parsed.pathname.replace(/\/+$/, "");
    if (path.toLowerCase().endsWith(PROGRAM_PATH_SUFFIX)) {
      path = path.slice(0, -PROGRAM_PATH_SUFFIX.length);
    }
    parsed.pathname = path || "/";
    return normalizeUrl(parsed);
  } catch {
    return null;
  }
}

function toProgramFeedUrl(candidateUrl: string): string | null {
  try {
    const parsed = new URL(candidateUrl);
    const path = parsed.pathname.replace(/\/+$/, "");
    if (path.toLowerCase().endsWith(PROGRAM_PATH_SUFFIX)) {
      parsed.pathname = path;
      return normalizeUrl(parsed);
    }
    parsed.pathname = `${path || ""}${PROGRAM_PATH_SUFFIX}`;
    return normalizeUrl(parsed);
  } catch {
    return null;
  }
}

function resolveProgramFeedUrl(): string | null {
  return sanitizeEnvValue(process.env.PROGRAM_FEED_URL) ?? null;
}

export function resolveReplitApiKey(): string | null {
  const candidates = [
    process.env.FEED_API_KEY,
    process.env.PROGRAM_FEED_API_KEY,
    process.env.REPLIT_API_KEY,
    process.env.PROGRAM_API_KEY,
    process.env.API_KEY,
    process.env.NEXT_PUBLIC_PROGRAM_FEED_API_KEY,
    process.env.NEXT_PUBLIC_REPLIT_API_KEY,
  ];
  for (const candidate of candidates) {
    const resolved = sanitizeEnvValue(candidate);
    if (resolved) return resolved;
  }
  return null;
}

export function resolveReplitBaseUrlCandidates(): string[] {
  const configuredBase = sanitizeEnvValue(process.env.REPLIT_URL) ?? sanitizeEnvValue(process.env.NEXT_PUBLIC_REPLIT_URL) ?? null;
  const configuredFeedUrl = resolveProgramFeedUrl();
  const derivedBase = configuredFeedUrl ? deriveBaseUrlFromProgramFeed(configuredFeedUrl) : null;

  const candidates: string[] = [];
  const seen = new Set<string>();
  pushUnique(candidates, seen, configuredBase);
  pushUnique(candidates, seen, derivedBase);
  pushUnique(candidates, seen, DEFAULT_REPLIT_BASE_URL);
  return candidates;
}

export function resolveProgramFeedUrlCandidates(): string[] {
  const configuredFeedUrl = resolveProgramFeedUrl();
  const baseCandidates = resolveReplitBaseUrlCandidates();

  const candidates: string[] = [];
  const seen = new Set<string>();

  pushUnique(candidates, seen, configuredFeedUrl ? toProgramFeedUrl(configuredFeedUrl) : null);
  for (const base of baseCandidates) {
    pushUnique(candidates, seen, toProgramFeedUrl(base));
  }
  return candidates;
}

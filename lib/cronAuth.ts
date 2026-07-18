import crypto from "node:crypto";

function timingSafeEqualStr(provided: string, secret: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

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

// Vercel Cron podepisuje requesty hlavičkou `Authorization: Bearer <CRON_SECRET>`.
// Akceptujeme proto KTERÝKOLI z nakonfigurovaných secretů (PROGRAM_CACHE_CRON_SECRET
// i CRON_SECRET), aby autorizace fungovala bez ohledu na to, kterým Vercel podepisuje.
// (Dřív se bralo jen `PROGRAM_CACHE_CRON_SECRET ?? CRON_SECRET` — když byl nastavený
// ten první, ale Vercel posílal CRON_SECRET, vracelo to 401 a ingest se zastavil.)
export function isCronAuthorized(request: Request): boolean {
  // POZN.: Vercel podepisuje cron requesty `Authorization: Bearer <CRON_SECRET>`
  // JEN když je env pojmenovaný přesně `CRON_SECRET`. Aby plánovaný cron prošel,
  // musí být v projektu nastavený `CRON_SECRET` (ne jen `PROGRAM_CACHE_CRON_SECRET`).
  // Hlavičku `x-vercel-cron-schedule` ZÁMĚRNĚ NEbereme jako autorizaci — je
  // forgeable (může ji nastavit kdokoliv) → byl by to auth bypass.
  const secrets = [process.env.PROGRAM_CACHE_CRON_SECRET, process.env.CRON_SECRET]
    .map((value) => sanitizeEnvValue(value))
    .filter((value): value is string => Boolean(value));
  if (secrets.length === 0) return true;

  const authHeader = request.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : null;
  const urlSecret = new URL(request.url).searchParams.get("secret")?.trim() ?? null;
  const provided = bearer ?? urlSecret;
  if (!provided) return false;

  return secrets.some((secret) => timingSafeEqualStr(provided, secret));
}

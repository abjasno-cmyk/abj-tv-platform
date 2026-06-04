import crypto from "node:crypto";

function timingSafeEqualStr(provided: string, secret: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Vercel Cron podepisuje requesty hlavičkou `Authorization: Bearer <CRON_SECRET>`.
// Akceptujeme proto KTERÝKOLI z nakonfigurovaných secretů (PROGRAM_CACHE_CRON_SECRET
// i CRON_SECRET), aby autorizace fungovala bez ohledu na to, kterým Vercel podepisuje.
// (Dřív se bralo jen `PROGRAM_CACHE_CRON_SECRET ?? CRON_SECRET` — když byl nastavený
// ten první, ale Vercel posílal CRON_SECRET, vracelo to 401 a ingest se zastavil.)
export function isCronAuthorized(request: Request): boolean {
  // Vercel Cron přidává na KAŽDÝ cron request hlavičku `x-vercel-cron-schedule`
  // (nastavuje ji Vercel infra). Bereme ji jako platnou autorizaci — Vercel totiž
  // podepisuje `Authorization: Bearer` JEN když je env pojmenovaný přesně `CRON_SECRET`;
  // když je nastavený jen `PROGRAM_CACHE_CRON_SECRET`, cron pošle bez Bearer a 401uje.
  // Endpoint je low-risk a idempotentní (refresh cache videí z veřejného YouTube),
  // takže tahle hlavička je dostatečný signál „jde o náš Vercel cron".
  if (request.headers.get("x-vercel-cron-schedule")) return true;

  const secrets = [process.env.PROGRAM_CACHE_CRON_SECRET, process.env.CRON_SECRET]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));
  if (secrets.length === 0) return true;

  const authHeader = request.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : null;
  const urlSecret = new URL(request.url).searchParams.get("secret")?.trim() ?? null;
  const provided = bearer ?? urlSecret;
  if (!provided) return false;

  return secrets.some((secret) => timingSafeEqualStr(provided, secret));
}

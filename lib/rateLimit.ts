import "server-only";

/**
 * In-memory sliding-window rate limiter.
 *
 * Beta-grade: state lives in a per-instance Map, so limits are enforced
 * per serverless instance rather than globally. Good enough to stop a
 * single abusive client; not a hard guarantee across the fleet.
 *
 * To upgrade to a shared store (Vercel KV / Upstash Redis) post-beta,
 * reimplement `checkRateLimit` against the KV REST API — the call sites
 * and the RateLimitResult contract stay the same.
 */

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
};

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

let lastSweep = 0;
const SWEEP_INTERVAL_MS = 60_000;

function sweepExpired(now: number): void {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

export type RateLimitOptions = {
  /** Logical bucket name, e.g. "abjx" or "wall-write". */
  scope: string;
  /** Stable identifier for the caller (hashed IP, user id, …). */
  identifier: string;
  /** Max requests allowed within the window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
};

export function checkRateLimit(options: RateLimitOptions): RateLimitResult {
  const { scope, identifier, limit, windowMs } = options;
  const now = Date.now();
  sweepExpired(now);

  const key = `${scope}:${identifier}`;
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { allowed: true, limit, remaining: limit - 1, resetAt };
  }

  if (existing.count >= limit) {
    return { allowed: false, limit, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return {
    allowed: true,
    limit,
    remaining: Math.max(0, limit - existing.count),
    resetAt: existing.resetAt,
  };
}

function readHeader(request: Request, key: string): string | null {
  const value = request.headers.get(key);
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function resolveClientIp(request: Request): string {
  const xForwardedFor = readHeader(request, "x-forwarded-for");
  if (xForwardedFor) {
    const first = xForwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }
  return readHeader(request, "x-real-ip") ?? "unknown-ip";
}

export function rateLimitResponse(result: RateLimitResult): Response {
  const retryAfterSeconds = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
  return Response.json(
    { error: "Příliš mnoho požadavků. Zkuste to prosím za chvíli." },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
      },
    }
  );
}

export const RATE_LIMITS = {
  /** Per-IP cap on public abj-x + wall traffic. */
  perIpPerMinute: { limit: 60, windowMs: 60_000 },
  /** Per-IP cap on write (POST) endpoints. */
  writePerHour: { limit: 200, windowMs: 60 * 60_000 },
} as const;

/**
 * Enforce both the per-minute burst cap and the per-hour write cap for a
 * write endpoint. Returns a ready-to-send 429 Response when either limit is
 * exceeded, or `null` when the request may proceed.
 */
export function enforceWriteRateLimit(request: Request, scope: string): Response | null {
  const ip = resolveClientIp(request);

  const burst = checkRateLimit({
    scope: `${scope}:burst`,
    identifier: ip,
    ...RATE_LIMITS.perIpPerMinute,
  });
  if (!burst.allowed) {
    return rateLimitResponse(burst);
  }

  const hourly = checkRateLimit({
    scope: `${scope}:write`,
    identifier: ip,
    ...RATE_LIMITS.writePerHour,
  });
  if (!hourly.allowed) {
    return rateLimitResponse(hourly);
  }

  return null;
}

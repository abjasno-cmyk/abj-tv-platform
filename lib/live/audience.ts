/** Lower bound of the random display boost (natural numbers, inclusive). */
export const VIEWER_BOOST_MIN = 9000;
/** Upper bound of the random display boost (natural numbers, inclusive). */
export const VIEWER_BOOST_MAX = 10105;

/** @deprecated Use getViewerDisplayBoost — kept for tests referencing the old fixed constant. */
export const VIEWER_DISPLAY_BOOST = 10_000;

/** Sessions without heartbeat longer than this are not counted. */
export const PRESENCE_TTL_SECONDS = 45;

const BOOST_CACHE_MS = 60 * 60 * 1000;

let cachedBoost: { value: number; expiresAt: number } | null = null;

export type AudienceSnapshot = {
  activeViewers: number;
  displayedViewers: number;
  displayBoost: number;
};

/** Random integer in [VIEWER_BOOST_MIN, VIEWER_BOOST_MAX]. */
export function rollViewerDisplayBoost(): number {
  const span = VIEWER_BOOST_MAX - VIEWER_BOOST_MIN + 1;
  return VIEWER_BOOST_MIN + Math.floor(Math.random() * span);
}

/** Cached hourly boost so the displayed count does not flicker on every poll. */
export function getViewerDisplayBoost(now = Date.now()): number {
  if (cachedBoost && now < cachedBoost.expiresAt) {
    return cachedBoost.value;
  }
  const value = rollViewerDisplayBoost();
  cachedBoost = { value, expiresAt: now + BOOST_CACHE_MS };
  return value;
}

export function resetViewerDisplayBoostCache(): void {
  cachedBoost = null;
}

export function buildAudienceSnapshot(
  activeViewers: number,
  displayBoost = getViewerDisplayBoost(),
): AudienceSnapshot {
  const active = Number.isFinite(activeViewers) ? Math.max(0, Math.floor(activeViewers)) : 0;
  const boost = Number.isFinite(displayBoost)
    ? Math.max(0, Math.floor(displayBoost))
    : getViewerDisplayBoost();
  return {
    activeViewers: active,
    displayBoost: boost,
    displayedViewers: active + boost,
  };
}

export function formatCzechAudienceNumber(value: number): string {
  return new Intl.NumberFormat("cs-CZ").format(Math.max(0, Math.floor(value)));
}

/** Czech plural for live audience (displayed count is typically 9 000+). */
export function czechViewerWord(count: number): string {
  const n = Math.abs(Math.floor(count));
  if (n === 1) return "divák";
  if (n >= 2 && n <= 4) return "diváci";
  return "diváků";
}

export function formatAudienceLine(snapshot: AudienceSnapshot): string {
  const countLabel = formatCzechAudienceNumber(snapshot.displayedViewers);
  const word = czechViewerWord(snapshot.displayedViewers);
  return `Právě sleduje ${countLabel} ${word}`;
}

export function isValidPresenceSessionId(value: string): boolean {
  return /^[a-zA-Z0-9_-]{8,120}$/.test(value);
}

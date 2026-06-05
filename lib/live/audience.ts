/** Added to the live concurrent count shown on the hero. */
export const VIEWER_DISPLAY_BOOST = 10_000;

/** Sessions without heartbeat longer than this are not counted. */
export const PRESENCE_TTL_SECONDS = 45;

export type AudienceSnapshot = {
  activeViewers: number;
  displayedViewers: number;
};

export function buildAudienceSnapshot(activeViewers: number): AudienceSnapshot {
  const active = Number.isFinite(activeViewers) ? Math.max(0, Math.floor(activeViewers)) : 0;
  return {
    activeViewers: active,
    displayedViewers: active + VIEWER_DISPLAY_BOOST,
  };
}

export function formatCzechAudienceNumber(value: number): string {
  return new Intl.NumberFormat("cs-CZ").format(Math.max(0, Math.floor(value)));
}

/** Czech plural for hero audience (displayed count is typically 10 000+). */
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

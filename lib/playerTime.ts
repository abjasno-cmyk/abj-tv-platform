export function formatPlayerClock(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const hh = Math.floor(safe / 3600);
  const mm = Math.floor((safe % 3600) / 60);
  const ss = safe % 60;
  if (hh > 0) {
    return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  }
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

export function clampSeekSeconds(seconds: number, duration: number): number {
  const safe = Math.max(0, Math.floor(seconds));
  if (duration > 0) return Math.min(safe, Math.max(0, Math.floor(duration) - 1));
  return safe;
}

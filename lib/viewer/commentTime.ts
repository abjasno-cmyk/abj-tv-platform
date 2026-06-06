export function formatRelativeCommentTime(value: string, now = Date.now()): string {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "teď";

  const diffMs = Math.max(0, now - timestamp);
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "Právě teď";
  if (minutes < 60) return czechMinutesAgo(minutes);

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return czechHoursAgo(hours);

  const days = Math.floor(hours / 24);
  if (days < 7) return czechDaysAgo(days);

  return new Intl.DateTimeFormat("cs-CZ", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestamp);
}

function czechMinutesAgo(minutes: number): string {
  if (minutes === 1) return "Před 1 minutou";
  if (minutes >= 2 && minutes <= 4) return `Před ${minutes} minutami`;
  return `Před ${minutes} minutami`;
}

function czechHoursAgo(hours: number): string {
  if (hours === 1) return "Před 1 hodinou";
  if (hours >= 2 && hours <= 4) return `Před ${hours} hodinami`;
  return `Před ${hours} hodinami`;
}

function czechDaysAgo(days: number): string {
  if (days === 1) return "Včera";
  if (days >= 2 && days <= 4) return `Před ${days} dny`;
  return `Před ${days} dny`;
}

export function authorInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase();
}

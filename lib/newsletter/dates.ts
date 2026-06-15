export const PRAGUE_TIME_ZONE = "Europe/Prague";

export function pragueEditionDate(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: PRAGUE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function pragueGreetingDateLabel(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("cs-CZ", {
    timeZone: PRAGUE_TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(now);
}

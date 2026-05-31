// Presentational helper: derive a VEROX DayNumeral marker (big numeral + short
// month label) from any timestamp. Pure formatting glue for the editorial date
// markers — no business logic, mirrors the Prague-zone display used elsewhere.
const MONTHS_CS = [
  "LED",
  "ÚNO",
  "BŘE",
  "DUB",
  "KVĚ",
  "ČVN",
  "ČVC",
  "SRP",
  "ZÁŘ",
  "ŘÍJ",
  "LIS",
  "PRO",
] as const;

export function dayNumeralParts(value: string | Date | null | undefined): { day: string; month: string } {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return { day: "—", month: "" };

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Prague",
    day: "2-digit",
    month: "2-digit",
  }).formatToParts(date);
  const map = new Map(parts.map((part) => [part.type, part.value]));
  const day = map.get("day") ?? "—";
  const monthIndex = Number(map.get("month")) - 1;
  const month = MONTHS_CS[monthIndex] ?? "";
  return { day, month };
}

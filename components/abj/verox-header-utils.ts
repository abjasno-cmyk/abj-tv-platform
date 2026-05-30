export function getPragueTimeLabel(date: Date): string {
  return new Intl.DateTimeFormat("cs-CZ", {
    timeZone: "Europe/Prague",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function getPragueDateHeader(date: Date): string {
  const parts = new Intl.DateTimeFormat("cs-CZ", {
    timeZone: "Europe/Prague",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, part) => {
      if (part.type !== "literal") acc[part.type] = part.value;
      return acc;
    }, {});

  const weekday = (parts.weekday ?? "").toLocaleUpperCase("cs-CZ");
  const day = parts.day ?? "";
  const month = (parts.month ?? "").toLocaleUpperCase("cs-CZ");
  const year = parts.year ?? "";
  return `${weekday} ${day}.${month} ${year}`.replace(/\s+/g, " ").trim();
}

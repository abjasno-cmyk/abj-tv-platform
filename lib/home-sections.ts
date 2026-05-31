// View-model types + pure formatting helpers for the live homepage editorial
// sections (V kostce / Videa / Komunita). No server-only imports — safe to use
// from both the server page (mapping) and the client section components (types).

export type HomeNewsItem = {
  slug: string;
  day: string;
  month: string;
  title: string;
  source: string;
  stamp: string;
  summary: string;
};

export type HomeVideoItem = {
  videoId: string;
  day: string;
  month: string;
  title: string;
  tag: string;
  thumbnail: string | null;
};

export type HomeWallPost = {
  id: string;
  author: string;
  body: string;
  likes: number;
  stamp: string;
};

// Czech month names in the nominative case (Intl `month: "long"` yields the
// genitive "května" in a date context); matches the showcase copy ("Květen").
const MONTHS_CS = [
  "Leden",
  "Únor",
  "Březen",
  "Duben",
  "Květen",
  "Červen",
  "Červenec",
  "Srpen",
  "Září",
  "Říjen",
  "Listopad",
  "Prosinec",
] as const;

function pragueParts(iso: string): Record<string, string> | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("cs-CZ", {
    timeZone: "Europe/Prague",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, part) => {
      if (part.type !== "literal") acc[part.type] = part.value;
      return acc;
    }, {});
}

// Oversized editorial date marker: big day numeral + small nominative month.
export function formatHomeDate(iso: string | null): { day: string; month: string } {
  const parts = iso ? pragueParts(iso) : null;
  if (!parts) return { day: "—", month: "" };
  const day = String(Number(parts.day ?? "1"));
  const monthIndex = Math.min(11, Math.max(0, Number(parts.month ?? "1") - 1));
  return { day, month: MONTHS_CS[monthIndex] };
}

// "DD.MM · HH:MM" broadcast timestamp.
export function formatHomeStamp(iso: string | null): string {
  const parts = iso ? pragueParts(iso) : null;
  if (!parts) return "";
  return `${parts.day}.${parts.month} · ${parts.hour}:${parts.minute}`;
}

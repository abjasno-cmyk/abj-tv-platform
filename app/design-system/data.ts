// Demo content for the VEROX design-system showcase. Copy is lifted / adapted
// from the reference layouts in zasilka-VGEFNI8C7K97F4I7 so the system is shown
// with real-shaped editorial material rather than lorem ipsum.

export type NavItem = { label: string; href: string; active?: boolean };

export const NAV_ITEMS: NavItem[] = [
  { label: "Živě", href: "#zive", active: true },
  { label: "Videa", href: "#videa" },
  { label: "V kostce", href: "#vkostce" },
  { label: "Komunita", href: "#komunita" },
  { label: "Můj Verox", href: "#muj-verox" },
];

export const TICKER_ITEMS: string[] = [
  "Živě ze studia — Chuť moci #145",
  "Sněmovna projednává rozpočet",
  "Reportáž: Strassmayerovo náměstí",
  "Rozhovor — Jindřich Rajchl",
  "Premiéra dnes 20:00",
  "Mainstreamový detox každý všední den",
];

export const HERO = {
  show: "The Tucker Carlson Show",
  title: "The Secret History of Biblical Giants, Demons & the Advanced Civilizations Before the Great Flood",
  author: "Tucker Carlson",
  tag: "Dokument",
  remaining: "22:08",
  watching: "4 312",
} as const;

export type FeedEntry = {
  day: string;
  month: string;
  title: string;
  source: string;
  stamp: string;
  body: string;
  kind: "video" | "text";
};

export const FEED: FeedEntry[] = [
  {
    day: "23",
    month: "Květen",
    title: "Danko a Cigániková na jednej strane? Toto nikto nečakal",
    source: "Jindřich Rajchl",
    stamp: "30.05 · 18:41",
    body: "Cigániková: Zo Sas by sme spolupracovať nemali. Poslankyňa otevřeně přiznává, čím si je jistá, a popisuje verzi, kterou nikdo nečekal — od počátku až po dnešní zlomovou schůzi.",
    kind: "video",
  },
  {
    day: "22",
    month: "Květen",
    title: "Tak tady to máte! Zasadil jsem jim tvrdý úder",
    source: "Ondřej Prokop",
    stamp: "30.05 · 19:48",
    body: "Ostře sledovaná jednání skončila otevřeným střetem. Komentář k tomu, co se dnes na sále skutečně odehrálo a proč to nikdo z koalice nečekal.",
    kind: "video",
  },
  {
    day: "20",
    month: "Květen",
    title: "Tohle byla pěkná rozkrádačka",
    source: "Redakce VEROX",
    stamp: "30.05 · 16:46",
    body: "Rozbor zakázky, u které čísla nesedí. Krok za krokem ukazujeme, kde se peníze ztrácejí a kdo za to ponese odpovědnost.",
    kind: "text",
  },
  {
    day: "19",
    month: "Květen",
    title: "Ďurčo: Bez rovného trhu český průmysl nepřežije",
    source: "Chuť moci #145",
    stamp: "30.05 · 08:41",
    body: "Rozhovor o tom, proč se výroba stěhuje za hranice a co by musela vláda udělat hned teď, aby se trend otočil. Bez příkras a bez servítků.",
    kind: "video",
  },
  {
    day: "17",
    month: "Květen",
    title: "Tohle seniory a nevidomé vyděsilo | Strassmayerovo náměstí",
    source: "Ondřej Prokop",
    stamp: "30.05 · 11:02",
    body: "Reportáž z místa, kde nová úprava křižovatky znepříjemnila život těm nejzranitelnějším. Mluvili jsme s lidmi, kterých se to týká.",
    kind: "video",
  },
];

export type Program = { time: string; title: string; tag: string; live?: boolean };

export const PROGRAM: Program[] = [
  { time: "07:00", title: "Ranní jasno", tag: "Magazín" },
  { time: "12:30", title: "Chuť moci", tag: "Talk", live: true },
  { time: "14:00", title: "V kostce — poledne", tag: "Zprávy" },
  { time: "18:00", title: "Studio Verox živě", tag: "Live" },
  { time: "20:00", title: "Velký rozhovor", tag: "Premiéra" },
  { time: "23:00", title: "Noční detox", tag: "Late night" },
];

export type VideoItem = {
  day: string;
  month: string;
  title: string;
  duration: string;
  tag: string;
};

export const VIDEOS: VideoItem[] = [
  { day: "30", month: "Květen", title: "The Secret History of Biblical Giants & the World Before the Flood", duration: "1:24:08", tag: "Dokument" },
  { day: "29", month: "Květen", title: "Sněmovna bez filtru: co se nedostalo do zpráv", duration: "18:42", tag: "Komentář" },
  { day: "28", month: "Květen", title: "Chuť moci #144 — energie, ceny a realita", duration: "52:11", tag: "Talk" },
  { day: "27", month: "Květen", title: "Reportáž: jak se staví dálnice, která nikam nevede", duration: "11:37", tag: "Reportáž" },
  { day: "26", month: "Květen", title: "Rozhovor: ekonom o tom, co přijde na podzim", duration: "34:05", tag: "Rozhovor" },
  { day: "24", month: "Květen", title: "Studio živě: vaše dotazy bez cenzury", duration: "2:03:50", tag: "Live" },
];

export type Channel = { name: string; note: string; live?: boolean; selected?: boolean };

export const CHANNELS: Channel[] = [
  { name: "Verox 1", note: "Hlavní kanál", live: true, selected: true },
  { name: "Verox Živě", note: "Nepřetržitě" },
  { name: "Chuť moci", note: "Pořad" },
  { name: "Studio", note: "Zákulisí" },
  { name: "Komunita", note: "Vy + my" },
  { name: "Archiv", note: "Vše ke zhlédnutí" },
];

export const SWATCHES = [
  { name: "Verox Orange", hex: "#F37021", rgb: "243 · 112 · 33", role: "Primární / akcent" },
  { name: "Ink", hex: "#171411", rgb: "23 · 20 · 17", role: "Text / wordmark" },
  { name: "Charcoal", hex: "#303030", rgb: "48 · 48 · 48", role: "Plochy" },
  { name: "Gray", hex: "#717171", rgb: "113 · 113 · 113", role: "Sekundární text" },
  { name: "Paper", hex: "#FBF8F2", rgb: "251 · 248 · 242", role: "Podklad" },
];

export const TYPE_SPECIMENS = [
  { face: "Bricolage Grotesque", role: "Display · nadpisy · číslice", sample: "Mainstreamový detox", className: "vx-display", style: { fontSize: "2rem" } },
  { face: "Source Sans 3", role: "Text · UI · navigace", sample: "Příště už to bude jasné — čteme mezi řádky.", className: "", style: { fontSize: "1.15rem", fontWeight: 400 } },
  { face: "JetBrains Mono", role: "Hodiny · časové značky · kickery", sample: "23:58 · 30.05 · ŽIVĚ", className: "vx-meta", style: { fontSize: "1rem" } },
];

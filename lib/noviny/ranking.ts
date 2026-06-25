import type { NovinyArticleWithRelations } from "@/lib/noviny/types";

export type RankedNovinyArticle = NovinyArticleWithRelations & {
  ranking: {
    total: number;
    novelty: number;
    severity: number;
    interest: number;
    neuro: number;
  };
};

const SEVERITY_KEYWORDS = [
  "válka",
  "konflikt",
  "krize",
  "kriz",
  "nouz",
  "kolaps",
  "sankc",
  "útok",
  "teror",
  "hrozb",
  "inflac",
  "reces",
  "stávk",
  "výpad",
  "krach",
  "blackout",
  "bezpečnost",
];

const INTEREST_KEYWORDS = [
  "šok",
  "překvap",
  "tajem",
  "skandál",
  "unik",
  "odhal",
  "zákulis",
  "kontroverz",
  "viral",
  "drama",
  "varov",
  "bomba",
  "obrat",
];

const NEURO_KEYWORDS = [
  "peněz",
  "penize",
  "ekonom",
  "rozpočet",
  "daň",
  "dluh",
  "cena",
  "mzd",
  "invest",
  "trh",
  "rizik",
  "ztrát",
  "zisk",
  "strach",
  "nejistot",
  "motiv",
  "chován",
  "spotřeb",
];

function normalize(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function keywordScore(text: string, dictionary: string[], maxScore: number): number {
  if (!text) return 0;
  let hits = 0;
  for (const keyword of dictionary) {
    if (text.includes(keyword)) hits += 1;
  }
  return clamp((hits / Math.max(1, dictionary.length * 0.15)) * maxScore, 0, maxScore);
}

function noveltyScore(publishedAt: string | null | undefined): number {
  if (!publishedAt) return 10;
  const ts = new Date(publishedAt).getTime();
  if (Number.isNaN(ts)) return 10;
  const ageHours = Math.max(0, (Date.now() - ts) / 3_600_000);
  const recency = 100 * Math.exp(-ageHours / 30);
  return clamp(recency, 5, 100);
}

export function scoreNovinyArticle(article: NovinyArticleWithRelations): RankedNovinyArticle {
  const title = normalize(article.edited_title ?? article.title);
  const perex = normalize(article.edited_perex ?? article.perex ?? "");
  const text = `${title} ${perex}`.trim();

  const novelty = noveltyScore(article.published_at);
  const severity = keywordScore(text, SEVERITY_KEYWORDS, 100);
  const interest = keywordScore(text, INTEREST_KEYWORDS, 100);
  const neuro = keywordScore(text, NEURO_KEYWORDS, 100);

  const weighted =
    novelty * 0.42 +
    severity * 0.24 +
    interest * 0.18 +
    neuro * 0.16;

  const perexLengthBonus = clamp((perex.length - 80) / 3, 0, 10);
  const total = clamp(weighted + perexLengthBonus, 0, 100);

  return {
    ...article,
    ranking: {
      total: Math.round(total),
      novelty: Math.round(novelty),
      severity: Math.round(severity),
      interest: Math.round(interest),
      neuro: Math.round(neuro),
    },
  };
}

export function rankNovinyArticles(articles: NovinyArticleWithRelations[]): RankedNovinyArticle[] {
  return articles
    .map(scoreNovinyArticle)
    .sort((a, b) => {
      if (b.ranking.total !== a.ranking.total) return b.ranking.total - a.ranking.total;
      const bTs = new Date(b.published_at ?? 0).getTime();
      const aTs = new Date(a.published_at ?? 0).getTime();
      return bTs - aTs;
    });
}

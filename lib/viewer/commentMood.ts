import { isLikelyCommentQuestion } from "@/lib/viewer/commentQuestion";

export type CommentMood = "question" | "angry" | "sad" | "positive" | "neutral";

const ANGRY_MARKERS = [
  "naštvan",
  "nastvan",
  "rozčil",
  "rozcil",
  "hněv",
  "hnev",
  "štvou",
  "stou",
  "katastrof",
  "hnus",
  "odporn",
  "nesmysl",
  "tragéd",
  "traged",
  "skandál",
  "skandal",
  "zločin",
  "zlocin",
  "idiot",
  "debil",
  "blbost",
  "šílen",
  "silen",
  "wtf",
  "do háje",
  "do haje",
];

const SAD_MARKERS = [
  "smutn",
  "zklaman",
  "bojím",
  "bojim",
  "strach",
  "beznad",
  "lituj",
  "škoda",
  "skoda",
  "mrzí",
  "mrzi",
];

const POSITIVE_MARKERS = [
  "díky",
  "dky",
  "děkuj",
  "dekuj",
  "skvěl",
  "skvel",
  "super",
  "parád",
  "parad",
  "výborn",
  "vyborn",
  "skvěle",
  "skvele",
  "úžas",
  "uzas",
  "báječ",
  "bajec",
  "krásn",
  "krasn",
  "fajn",
  "povedlo",
  "líbí",
  "libi",
  "pochval",
];

const ANGRY_EMOJI = /(?:😡|🤬|😤|💢|👎)/u;
const SAD_EMOJI = /(?:😢|😭|☹️|😞|🥺)/u;
const POSITIVE_EMOJI = /(?:👍|😊|🙂|❤️|🧡|💚|🍀|✨|🙏)/u;

function normalizeForMatch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function containsAny(haystack: string, needles: string[]): boolean {
  return needles.some((needle) => haystack.includes(needle));
}

function isMostlyUppercase(body: string): boolean {
  const letters = body.replace(/[^A-Za-zÁČĎÉĚÍŇÓŘŠŤÚŮÝŽáčďéěíňóřšťúůýž]/g, "");
  if (letters.length < 8) return false;
  const upper = letters.replace(/[^A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ]/g, "").length;
  return upper / letters.length >= 0.7;
}

function hasAngryPunctuation(body: string): boolean {
  return /!{3,}/.test(body) || /\?{3,}/.test(body);
}

export function detectCommentMood(body: string): CommentMood {
  const trimmed = body.trim();
  if (!trimmed) return "neutral";
  if (isLikelyCommentQuestion(trimmed)) return "question";

  const normalized = normalizeForMatch(trimmed);
  if (ANGRY_EMOJI.test(trimmed) || containsAny(normalized, ANGRY_MARKERS) || (isMostlyUppercase(trimmed) && hasAngryPunctuation(trimmed))) {
    return "angry";
  }
  if (SAD_EMOJI.test(trimmed) || containsAny(normalized, SAD_MARKERS)) {
    return "sad";
  }
  if (POSITIVE_EMOJI.test(trimmed) || containsAny(normalized, POSITIVE_MARKERS)) {
    return "positive";
  }
  return "neutral";
}

export function hashSeed(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function pickVariant<T>(items: readonly T[], seed: string): T {
  if (items.length === 0) {
    throw new Error("pickVariant requires at least one item");
  }
  return items[hashSeed(seed) % items.length]!;
}

import type { CreateWallPostInput, WallStatus } from "@/lib/wallTypes";

type WallModerationResult = {
  status: WallStatus;
  reasons: string[];
};

const STRONG_BLOCKLIST = [
  "kill yourself",
  "zabiju te",
  "chcipni",
  "nazi",
];

const SOFT_BLOCKLIST = [
  "viagra",
  "casino",
  "loan",
  "půjčka bez registru",
  "bitcoin double",
  "telegram signal",
];

const VULGARITY_LIST = [
  "kurva",
  "debil",
  "hajzl",
  "piča",
  "zmrd",
];

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function countLinks(value: string): number {
  return (value.match(/https?:\/\/|www\./gi) ?? []).length;
}

function hasRepeatedCharacters(value: string): boolean {
  return /(.)\1{7,}/.test(value);
}

function hasRepeatedWords(value: string): boolean {
  return /\b(\w+)\b(?:\s+\1\b){5,}/i.test(value);
}

function parseBooleanEnv(value?: string): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function containsAny(haystack: string, needles: string[]): boolean {
  return needles.some((needle) => haystack.includes(needle));
}

export function moderateWallPost(input: CreateWallPostInput): WallModerationResult {
  const reasons: string[] = [];
  const normalizedBody = normalizeText(input.body);
  const linkCount = countLinks(input.body);

  if (containsAny(normalizedBody, STRONG_BLOCKLIST)) {
    reasons.push("silně nevhodný obsah");
    return { status: "rejected", reasons };
  }

  if (containsAny(normalizedBody, VULGARITY_LIST)) {
    reasons.push("vulgarity");
  }
  if (containsAny(normalizedBody, SOFT_BLOCKLIST)) {
    reasons.push("spamová klíčová slova");
  }
  if (linkCount >= 3) {
    reasons.push("nadměrné množství odkazů");
  } else if (linkCount >= 2) {
    reasons.push("více externích odkazů");
  }
  if (hasRepeatedCharacters(input.body)) {
    reasons.push("opakování znaků");
  }
  if (hasRepeatedWords(normalizedBody)) {
    reasons.push("opakování slov");
  }

  const autoApprove = parseBooleanEnv(process.env.WALL_AUTO_APPROVE);
  if (reasons.length === 0 && autoApprove) {
    return { status: "approved", reasons: [] };
  }
  if (reasons.includes("nadměrné množství odkazů")) {
    return { status: "flagged", reasons };
  }
  if (reasons.length > 0) {
    return { status: "pending", reasons };
  }
  return { status: "pending", reasons: ["čeká na schválení"] };
}

export function summarizeWallActivity(): null {
  // TODO: Replace with AI-generated editorial summary (sentiment/topics/highlights).
  return null;
}


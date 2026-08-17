import "server-only";

import { LOCALE_EN, type VeroxLocale } from "@/lib/i18n/config";
import { translateText } from "@/lib/i18n/translate";
import type { PublicAuthorProfile } from "@/lib/nazory/types";

const AUTHOR_PROFESSION_TRANSLATIONS: Record<string, string> = {
  advokat: "lawyer",
  advokatka: "lawyer",
  analytik: "analyst",
  analyticka: "analyst",
  biolog: "biologist",
  ekonom: "economist",
  ekonomka: "economist",
  epidemiolog: "epidemiologist",
  epidemiolozka: "epidemiologist",
  filosof: "philosopher",
  filozof: "philosopher",
  historik: "historian",
  lekar: "physician",
  lekarka: "physician",
  novinar: "journalist",
  novinarka: "journalist",
  pedagog: "educator",
  pedagozka: "educator",
  politolog: "political scientist",
  politolozka: "political scientist",
  pravnik: "lawyer",
  pravnicka: "lawyer",
  profesor: "professor",
  profesorka: "professor",
  publicista: "commentator",
  publicistka: "commentator",
  spisovatel: "writer",
  spisovatelka: "writer",
  sociolog: "sociologist",
  sociolozka: "sociologist",
  vedec: "scientist",
  vedkyne: "scientist",
  vyzkumnik: "researcher",
  vyzkumnice: "researcher",
};

function normalizeProfession(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[.,;:]+$/g, "")
    .replace(/\s+/g, " ");
}

async function translateField(value: string | null, maxLength: number): Promise<string | null> {
  if (!value) return null;
  return (await translateText(value, "en", maxLength)) ?? value;
}

async function translateProfession(value: string | null): Promise<string | null> {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const normalized = normalizeProfession(trimmed);
  const exact = AUTHOR_PROFESSION_TRANSLATIONS[normalized];
  if (exact) return exact;

  const contextual = await translateText(`Author profession: ${trimmed}`, "en", 220);
  const cleaned = contextual
    ?.replace(/^author'?s?\s+profession\s*:\s*/i, "")
    .replace(/^profession\s*:\s*/i, "")
    .trim();

  return cleaned || (await translateField(trimmed, 180));
}

export async function localizePublicAuthorProfile(
  author: PublicAuthorProfile,
  locale: VeroxLocale,
): Promise<PublicAuthorProfile> {
  if (locale !== LOCALE_EN) return author;

  const [title, profession, city, bio] = await Promise.all([
    translateField(author.title, 180),
    translateProfession(author.profession),
    translateField(author.city, 120),
    translateField(author.bio, 1600),
  ]);

  return {
    ...author,
    title,
    profession,
    city,
    bio,
  };
}

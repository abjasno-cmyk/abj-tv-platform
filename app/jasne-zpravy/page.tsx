import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";

import { JasneZpravyPageClient } from "@/app/jasne-zpravy/JasneZpravyPageClient";
import { fetchLatestPublishedJasneZpravy } from "@/lib/jasneZpravyData";

const DEFAULT_TITLE = "Jasné zprávy | Aby bylo jasno";
const DEFAULT_DESCRIPTION = "Aktuální přehled domácích a zahraničních zpráv s odkazy na zdroje.";

function sanitizeEnvValue(value?: string): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  const equalsIdx = trimmed.indexOf("=");
  const maybeAssigned =
    equalsIdx > 0 && /^[A-Z0-9_]+$/.test(trimmed.slice(0, equalsIdx))
      ? trimmed.slice(equalsIdx + 1).trim()
      : trimmed;
  if (
    (maybeAssigned.startsWith('"') && maybeAssigned.endsWith('"')) ||
    (maybeAssigned.startsWith("'") && maybeAssigned.endsWith("'"))
  ) {
    return maybeAssigned.slice(1, -1).trim();
  }
  return maybeAssigned;
}

async function fetchMetadataEdition(): Promise<{
  title?: string | null;
  summary?: string | null;
} | null> {
  const url = sanitizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = sanitizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!url || !anonKey) return null;

  try {
    const client = createClient(url, anonKey);
    const edition = await fetchLatestPublishedJasneZpravy(client);
    if (!edition) return null;
    return {
      title: edition.title,
      summary: edition.summary,
    };
  } catch {
    return null;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const edition = await fetchMetadataEdition();
  const title = edition?.title ? `${edition.title} | Aby bylo jasno` : DEFAULT_TITLE;
  const description = edition?.summary ?? DEFAULT_DESCRIPTION;
  return {
    title,
    description,
  };
}

export const dynamic = "force-dynamic";

export default function JasneZpravyPage() {
  return <JasneZpravyPageClient />;
}


import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type NewsletterSubscriber = {
  userId: string;
  email: string;
  displayName: string | null;
};

export async function loadNewsletterSubscribers(
  supabase: SupabaseClient,
): Promise<NewsletterSubscriber[]> {
  const [profilesRes, consentsRes] = await Promise.all([
    supabase.from("profiles").select("id, email, display_name"),
    supabase
      .from("consents")
      .select("user_id, granted, created_at")
      .eq("consent_type", "newsletter")
      .order("created_at", { ascending: false }),
  ]);

  if (profilesRes.error) {
    throw new Error(`Nepodařilo se načíst profily: ${profilesRes.error.message}`);
  }
  if (consentsRes.error) {
    throw new Error(`Nepodařilo se načíst souhlasy: ${consentsRes.error.message}`);
  }

  const latestConsentByUser = new Map<string, boolean>();
  for (const row of consentsRes.data ?? []) {
    const userId = row.user_id as string;
    if (latestConsentByUser.has(userId)) continue;
    latestConsentByUser.set(userId, Boolean(row.granted));
  }

  const subscribers: NewsletterSubscriber[] = [];
  for (const row of profilesRes.data ?? []) {
    const userId = row.id as string;
    if (latestConsentByUser.get(userId) !== true) continue;
    const email = (row.email as string | null)?.trim().toLowerCase() ?? "";
    if (!email || !email.includes("@")) continue;
    subscribers.push({
      userId,
      email,
      displayName: (row.display_name as string | null)?.trim() || null,
    });
  }

  return subscribers;
}

export async function loadAlreadySentUserIds(
  supabase: SupabaseClient,
  editionDate: string,
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("newsletter_send_log")
    .select("user_id")
    .eq("edition_date", editionDate)
    .eq("status", "sent");

  if (error) {
    if (/relation .*newsletter_send_log.* does not exist/i.test(error.message)) {
      return new Set();
    }
    throw new Error(`Nepodařilo se načíst log rozesílek: ${error.message}`);
  }

  return new Set((data ?? []).map((row) => row.user_id as string));
}

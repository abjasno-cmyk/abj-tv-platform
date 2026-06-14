import "server-only";

import { loadStructuredFeedPayload } from "@/lib/dayOverview";
import { buildDailyNewsletterContent } from "@/lib/newsletter/buildDailyNewsletter";
import { pragueEditionDate } from "@/lib/newsletter/dates";
import { isNewsletterSendingEnabled, sendNewsletterEmail } from "@/lib/newsletter/resend";
import {
  loadAlreadySentUserIds,
  loadNewsletterSubscribers,
  type NewsletterSubscriber,
} from "@/lib/newsletter/subscribers";
import { SITE_URL } from "@/lib/site";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export type DailyNewsletterRunResult = {
  editionDate: string;
  enabled: boolean;
  dryRun: boolean;
  subscriberCount: number;
  attempted: number;
  sent: number;
  dryRunCount: number;
  failed: number;
  skippedAlreadySent: number;
  subject: string;
  errors: string[];
};

async function logSendResult(input: {
  userId: string;
  editionDate: string;
  status: "sent" | "failed" | "skipped";
  providerMessageId?: string | null;
  error?: string | null;
}): Promise<void> {
  try {
    const service = createSupabaseServiceClient();
    await service.from("newsletter_send_log").upsert(
      {
        user_id: input.userId,
        edition_date: input.editionDate,
        status: input.status,
        provider_message_id: input.providerMessageId ?? null,
        error: input.error ?? null,
      },
      { onConflict: "user_id,edition_date" },
    );
  } catch (error) {
    console.error("newsletter-send-log-failed", error);
  }
}

async function sendToSubscriber(
  subscriber: NewsletterSubscriber,
  editionDate: string,
  content: ReturnType<typeof buildDailyNewsletterContent>,
): Promise<"sent" | "failed" | "dryRun"> {
  const result = await sendNewsletterEmail({
    to: subscriber.email,
    subject: content.subject,
    html: content.html,
    text: content.text,
    previewText: content.previewText,
  });

  if (result.dryRun) {
    return "dryRun";
  }

  if (!result.ok) {
    await logSendResult({
      userId: subscriber.userId,
      editionDate,
      status: "failed",
      error: result.error,
    });
    return "failed";
  }

  await logSendResult({
    userId: subscriber.userId,
    editionDate,
    status: "sent",
    providerMessageId: result.messageId,
  });
  return "sent";
}

export async function runDailyNewsletter(now: Date = new Date()): Promise<DailyNewsletterRunResult> {
  const editionDate = pragueEditionDate(now);
  const enabled = isNewsletterSendingEnabled();
  const service = createSupabaseServiceClient();

  const [subscribers, alreadySent, feedPayload] = await Promise.all([
    loadNewsletterSubscribers(service),
    loadAlreadySentUserIds(service, editionDate),
    loadStructuredFeedPayload().catch(() => ({ top: [], topics: {}, channels: {} })),
  ]);

  const content = buildDailyNewsletterContent({
    videos: feedPayload.top ?? [],
    now,
    siteUrl: SITE_URL,
  });

  const pending = subscribers.filter((subscriber) => !alreadySent.has(subscriber.userId));
  let sent = 0;
  let failed = 0;
  let dryRunCount = 0;
  const errors: string[] = [];

  for (const subscriber of pending) {
    const outcome = await sendToSubscriber(subscriber, editionDate, content);
    if (outcome === "sent") {
      sent += 1;
    } else if (outcome === "dryRun") {
      dryRunCount += 1;
      await logSendResult({
        userId: subscriber.userId,
        editionDate,
        status: "skipped",
        error: "dry_run",
      });
    } else {
      failed += 1;
      errors.push(`${subscriber.email}: send failed`);
    }
  }

  return {
    editionDate,
    enabled,
    dryRun: !enabled,
    subscriberCount: subscribers.length,
    attempted: pending.length,
    sent,
    dryRunCount,
    failed,
    skippedAlreadySent: subscribers.length - pending.length,
    subject: content.subject,
    errors: errors.slice(0, 20),
  };
}

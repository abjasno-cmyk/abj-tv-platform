import type { FeedVideo } from "@/lib/dayOverview";
import { SITE_URL } from "@/lib/site";
import { videoSharePath } from "@/lib/viewer/videoMetadata";
import { pragueGreetingDateLabel } from "@/lib/newsletter/dates";

export type DailyNewsletterContent = {
  subject: string;
  previewText: string;
  html: string;
  text: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function pickVideos(videos: FeedVideo[], limit = 5): FeedVideo[] {
  const unique: FeedVideo[] = [];
  const seen = new Set<string>();
  for (const video of videos) {
    const key = video.video_id.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(video);
    if (unique.length >= limit) break;
  }
  return unique;
}

export function buildDailyNewsletterContent(input: {
  videos: FeedVideo[];
  now?: Date;
  siteUrl?: string;
}): DailyNewsletterContent {
  const siteUrl = (input.siteUrl ?? SITE_URL).replace(/\/+$/, "");
  const selected = pickVideos(input.videos, 5);
  const dateLabel = pragueGreetingDateLabel(input.now);
  const subject = `Váš denní Verox — ${dateLabel}`;

  const videoItemsHtml =
    selected.length > 0
      ? selected
          .map((video) => {
            const href = `${siteUrl}${videoSharePath(video.video_id)}`;
            return `<li style="margin:0 0 14px;">
  <a href="${href}" style="color:#ff6600;font-weight:700;text-decoration:none;">${escapeHtml(video.title)}</a>
  <div style="color:#666;font-size:13px;margin-top:4px;">${escapeHtml(video.channel)}</div>
</li>`;
          })
          .join("")
      : `<li style="margin:0 0 14px;color:#666;">Dnes připravujeme nový výběr — mrkněte rovnou na Živě.</li>`;

  const videoItemsText =
    selected.length > 0
      ? selected
          .map((video) => {
            const href = `${siteUrl}${videoSharePath(video.video_id)}`;
            return `• ${video.title} (${video.channel})\n  ${href}`;
          })
          .join("\n")
      : "• Dnes připravujeme nový výběr — mrkněte rovnou na Živě.";

  const previewText =
    selected.length > 0
      ? `${selected[0]!.title} a další tipy na dnešní den.`
      : "Novinky, videa a diskuse na Veroxu — zdarma.";

  const html = `<!doctype html>
<html lang="cs">
  <body style="margin:0;padding:0;background:#f7f4ef;font-family:Arial,sans-serif;color:#171411;">
    <div style="max-width:620px;margin:0 auto;padding:24px 16px;">
      <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#ff6600;font-weight:700;">VEROX</p>
      <h1 style="margin:0 0 12px;font-size:24px;line-height:1.25;">Dobrý den z Veroxu</h1>
      <p style="margin:0 0 18px;line-height:1.6;color:#4b4b4b;">
        ${escapeHtml(dateLabel)} — krátký výběr toho, co stojí za pozornost. Verox je zdarma, diskuse i ukládání videí zůstávají u vás v Můj Verox.
      </p>
      <div style="background:#fff;border:1px solid rgba(23,20,17,0.08);border-radius:14px;padding:18px 20px;margin-bottom:18px;">
        <h2 style="margin:0 0 12px;font-size:16px;">Dnešní tipy</h2>
        <ul style="margin:0;padding:0;list-style:none;">${videoItemsHtml}</ul>
      </div>
      <p style="margin:0 0 18px;">
        <a href="${siteUrl}/live" style="display:inline-block;background:#ff6600;color:#fff;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:999px;">Otevřít Živě</a>
      </p>
      <p style="margin:0;font-size:12px;line-height:1.6;color:#777;">
        Dostáváte tento e-mail, protože jste souhlasili s novinkami Veroxu.
        Odběr můžete kdykoli vypnout v <a href="${siteUrl}/muj-verox" style="color:#ff6600;">Můj Verox</a>
        nebo nám napište na <a href="mailto:lipovska.hana@seznam.cz" style="color:#ff6600;">lipovska.hana@seznam.cz</a>.
      </p>
    </div>
  </body>
</html>`;

  const text = `VEROX — Váš denní výběr
${dateLabel}

${previewText}

Dnešní tipy:
${videoItemsText}

Otevřít Živě: ${siteUrl}/live

Odběr spravujete v Můj Verox: ${siteUrl}/muj-verox
Odhlášení e-mailem: lipovska.hana@seznam.cz`;

  return { subject, previewText, html, text };
}

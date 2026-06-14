import "server-only";

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
  previewText?: string;
};

type SendEmailResult = {
  ok: boolean;
  messageId: string | null;
  error: string | null;
  dryRun: boolean;
};

function sanitizeEnv(value?: string): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function resolveNewsletterFromAddress(): string {
  return sanitizeEnv(process.env.NEWSLETTER_FROM_EMAIL) ?? "Verox <newsletter@verox.cz>";
}

export function isNewsletterSendingEnabled(): boolean {
  const flag = sanitizeEnv(process.env.NEWSLETTER_ENABLED)?.toLowerCase();
  if (flag === "0" || flag === "false" || flag === "no") return false;
  return Boolean(sanitizeEnv(process.env.RESEND_API_KEY));
}

export async function sendNewsletterEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = sanitizeEnv(process.env.RESEND_API_KEY);
  if (!apiKey || !isNewsletterSendingEnabled()) {
    return {
      ok: true,
      messageId: null,
      error: null,
      dryRun: true,
    };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: resolveNewsletterFromAddress(),
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
      headers: input.previewText ? { "X-Entity-Ref-ID": input.previewText.slice(0, 120) } : undefined,
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    id?: string;
    message?: string;
    error?: string | { message?: string };
  };

  if (!response.ok) {
    const message =
      (typeof payload.error === "string" ? payload.error : payload.error?.message) ??
      payload.message ??
      `Resend HTTP ${response.status}`;
    return { ok: false, messageId: null, error: message, dryRun: false };
  }

  return {
    ok: true,
    messageId: payload.id?.trim() || null,
    error: null,
    dryRun: false,
  };
}

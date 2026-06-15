import { isCronAuthorized } from "@/lib/cronAuth";
import { runDailyNewsletter } from "@/lib/newsletter/sendDailyNewsletter";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runDailyNewsletter();
    return Response.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Daily newsletter failed.";
    console.error("daily-newsletter-error", error);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}

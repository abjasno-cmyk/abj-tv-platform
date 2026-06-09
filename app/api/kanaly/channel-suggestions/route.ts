import { enforceWriteRateLimit } from "@/lib/rateLimit";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ChannelSuggestionPayload = {
  channelName?: unknown;
  channelUrl?: unknown;
  reason?: unknown;
};

function normalizeString(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function isPlausibleYouTubeUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    const host = parsed.hostname.toLowerCase();
    return host === "youtu.be" || host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com");
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const limited = enforceWriteRateLimit(request, "kanaly-suggest");
  if (limited) return limited;

  let payload: ChannelSuggestionPayload;
  try {
    payload = (await request.json()) as ChannelSuggestionPayload;
  } catch {
    return Response.json({ error: "Neplatný požadavek." }, { status: 400 });
  }

  const channelName = normalizeString(payload.channelName, 200);
  const channelUrl = normalizeString(payload.channelUrl, 500);
  const reason = normalizeString(payload.reason, 2000);

  if (channelName.length < 2) {
    return Response.json({ error: "Zadejte název kanálu." }, { status: 400 });
  }
  if (!isPlausibleYouTubeUrl(channelUrl)) {
    return Response.json({ error: "Zadejte platný odkaz na YouTube kanál." }, { status: 400 });
  }
  if (reason.length < 10) {
    return Response.json({ error: "Stručně vysvětlete, proč by kanál měl být v nabídce." }, { status: 400 });
  }

  let userId: string | null = null;
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  } catch {
    // Anonymous suggestions are allowed.
  }

  try {
    const service = createSupabaseServiceClient();
    const insert = await service.from("channel_suggestions").insert({
      channel_name: channelName,
      channel_url: channelUrl,
      reason,
      user_id: userId,
    });

    if (insert.error) {
      console.error("channel-suggestion-insert-failed", insert.error.message);
      return Response.json({ error: "Návrh se nepodařilo uložit." }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error("channel-suggestion-unavailable", error);
    return Response.json({ error: "Návrh se nepodařilo uložit." }, { status: 503 });
  }
}

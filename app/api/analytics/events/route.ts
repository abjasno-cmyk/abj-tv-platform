import { enforceWriteRateLimit } from "@/lib/rateLimit";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ALLOWED_EVENTS = new Set([
  "page_view",
  "video_start",
  "video_progress",
  "video_complete",
  "video_pause",
  "like_click",
  "comment_submit",
  "login_start",
  "login_success",
  "news_open",
  "jasne_zpravy_open",
  "breaking_view",
  "breaking_click",
  "channel_open",
  "search",
  "follow_channel",
  "resume_video",
  "live_open",
  "archive_open",
]);

type AnalyticsPayload = {
  event_name?: unknown;
  entity_type?: unknown;
  entity_id?: unknown;
  anonymous_id?: unknown;
  session_id?: unknown;
  properties?: unknown;
};

function asString(value: unknown, maxLen: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized) return null;
  return normalized.slice(0, maxLen);
}

function sanitizeProperties(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const source = value as Record<string, unknown>;
  const output: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(source)) {
    const trimmedKey = key.trim().slice(0, 80);
    if (!trimmedKey) continue;
    if (
      typeof raw === "string" ||
      typeof raw === "number" ||
      typeof raw === "boolean" ||
      raw === null
    ) {
      output[trimmedKey] = typeof raw === "string" ? raw.slice(0, 500) : raw;
    }
  }
  return output;
}

function pickProgressValue(properties: Record<string, unknown>): number | null {
  const value = properties.progress_percent;
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.max(0, Math.min(100, value));
}

export async function POST(request: Request) {
  const limited = enforceWriteRateLimit(request, "analytics");
  if (limited) return limited;

  const supabase = await createSupabaseServerClient();
  const payload = (await request.json().catch(() => ({}))) as AnalyticsPayload;

  const eventName = asString(payload.event_name, 80);
  if (!eventName || !ALLOWED_EVENTS.has(eventName)) {
    return Response.json({ error: "Nepovolený event_name." }, { status: 400 });
  }

  const entityType = asString(payload.entity_type, 80);
  const entityId = asString(payload.entity_id, 200);
  const sessionId = asString(payload.session_id, 120);
  const anonymousId = asString(payload.anonymous_id, 120);
  const properties = sanitizeProperties(payload.properties);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (eventName === "video_progress") {
    const matcher = await supabase
      .from("analytics_events")
      .select("created_at, properties")
      .eq("event_name", "video_progress")
      .eq("entity_type", entityType ?? "video")
      .eq("entity_id", entityId ?? "")
      .order("created_at", { ascending: false })
      .limit(1);

    if (!matcher.error && matcher.data?.[0]) {
      const latest = matcher.data[0] as { created_at: string; properties: Record<string, unknown> | null };
      const latestAt = new Date(latest.created_at).getTime();
      const nowTs = Date.now();
      const secondsSince = Number.isFinite(latestAt) ? (nowTs - latestAt) / 1000 : 999;
      const prevProgress = pickProgressValue(latest.properties ?? {});
      const currentProgress = pickProgressValue(properties);
      const progressDelta =
        prevProgress !== null && currentProgress !== null ? Math.abs(currentProgress - prevProgress) : 100;
      if (secondsSince < 10 && progressDelta < 8) {
        return Response.json({ ok: true, throttled: true });
      }
    }
  }

  const insert = await supabase.from("analytics_events").insert({
    user_id: user?.id ?? null,
    anonymous_id: anonymousId,
    session_id: sessionId,
    event_name: eventName,
    entity_type: entityType,
    entity_id: entityId,
    properties,
  });

  if (insert.error) {
    return Response.json({ error: "Event se nepodařilo uložit." }, { status: 500 });
  }

  return Response.json({ ok: true });
}

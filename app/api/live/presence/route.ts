import { buildAudienceSnapshot, isValidPresenceSessionId } from "@/lib/live/audience";
import { countActiveSitePresence, pruneStaleSitePresence, upsertSitePresence } from "@/lib/live/presenceDb";
import { enforceWriteRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

type PresencePayload = {
  session_id?: unknown;
  page_path?: unknown;
};

function asOptionalPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || !trimmed.startsWith("/")) return null;
  return trimmed.slice(0, 200);
}

async function readAudiencePayload() {
  try {
    const activeViewers = await countActiveSitePresence();
    return buildAudienceSnapshot(activeViewers);
  } catch {
    return null;
  }
}

export async function GET() {
  const snapshot = await readAudiencePayload();
  if (!snapshot) {
    return Response.json({ ok: false, error: "Audience unavailable" }, { status: 503 });
  }
  return Response.json({
    ok: true,
    activeViewers: snapshot.activeViewers,
    displayedViewers: snapshot.displayedViewers,
    displayBoost: snapshot.displayBoost,
  });
}

export async function POST(request: Request) {
  const limited = enforceWriteRateLimit(request, "live-presence");
  if (limited) return limited;

  const payload = (await request.json().catch(() => ({}))) as PresencePayload;
  const sessionId = typeof payload.session_id === "string" ? payload.session_id.trim() : "";
  if (!isValidPresenceSessionId(sessionId)) {
    return Response.json({ error: "Neplatné session_id." }, { status: 400 });
  }

  const pagePath = asOptionalPath(payload.page_path);

  try {
    await upsertSitePresence(sessionId, pagePath);
    void pruneStaleSitePresence().catch(() => {
      // Best-effort cleanup.
    });
  } catch {
    return Response.json({ ok: false, error: "Presence unavailable" }, { status: 503 });
  }

  const snapshot = await readAudiencePayload();
  if (!snapshot) {
    return Response.json({ ok: true, heartbeat: true });
  }

  return Response.json({
    ok: true,
    heartbeat: true,
    activeViewers: snapshot.activeViewers,
    displayedViewers: snapshot.displayedViewers,
    displayBoost: snapshot.displayBoost,
  });
}

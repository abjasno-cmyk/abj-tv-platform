import { AuthApiError, requireAuthenticatedUser } from "@/lib/supabase/authenticated-server";

export const dynamic = "force-dynamic";

type ConsentPayload = {
  consentType?: unknown;
  granted?: unknown;
  source?: unknown;
};

function normalizeText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

export async function GET() {
  try {
    const { supabase, user } = await requireAuthenticatedUser();
    const result = await supabase
      .from("consents")
      .select("id, consent_type, granted, source, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (result.error) {
      return Response.json({ error: "Souhlasy se nepodařilo načíst.", details: result.error.message }, { status: 500 });
    }

    const latestByType = new Map<string, { granted: boolean; createdAt: string; source: string | null }>();
    for (const row of result.data ?? []) {
      if (!latestByType.has(row.consent_type)) {
        latestByType.set(row.consent_type, {
          granted: row.granted,
          createdAt: row.created_at,
          source: row.source,
        });
      }
    }

    return Response.json({
      consents: Object.fromEntries(latestByType.entries()),
      history: result.data ?? [],
    });
  } catch (error) {
    if (error instanceof AuthApiError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Souhlasy se nepodařilo načíst." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireAuthenticatedUser();
    const payload = (await request.json().catch(() => ({}))) as ConsentPayload;
    const consentType = normalizeText(payload.consentType, 80);
    const source = normalizeText(payload.source, 120) || "settings";
    const granted = payload.granted === true;

    if (!consentType) {
      return Response.json({ error: "consentType je povinné." }, { status: 400 });
    }

    const insert = await supabase.from("consents").insert({
      user_id: user.id,
      consent_type: consentType,
      granted,
      source,
    });
    if (insert.error) {
      return Response.json({ error: "Souhlas se nepodařilo uložit.", details: insert.error.message }, { status: 500 });
    }

    await supabase.from("viewer_activity").insert({
      user_id: user.id,
      event_type: "consent_updated",
      entity_type: "consent",
      entity_id: consentType,
      metadata: {
        granted,
        source,
      },
    });

    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthApiError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Souhlas se nepodařilo uložit." }, { status: 500 });
  }
}

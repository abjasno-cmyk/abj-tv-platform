import { AuthApiError, requireAuthenticatedUser } from "@/lib/supabase/authenticated-server";

export const dynamic = "force-dynamic";

type ProfilePayload = {
  displayName?: unknown;
};

function normalizeDisplayName(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, 120);
}

export async function GET() {
  try {
    const { supabase, user } = await requireAuthenticatedUser();
    const profile = await supabase
      .from("profiles")
      .select("id, email, display_name, avatar_url, provider, role, created_at, updated_at, last_seen_at")
      .eq("id", user.id)
      .single();

    if (profile.error || !profile.data) {
      return Response.json({ error: "Profil se nepodařilo načíst.", details: profile.error?.message }, { status: 500 });
    }

    return Response.json({ profile: profile.data });
  } catch (error) {
    if (error instanceof AuthApiError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Profil se nepodařilo načíst." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { supabase, user } = await requireAuthenticatedUser();
    const payload = (await request.json().catch(() => ({}))) as ProfilePayload;
    const displayName = normalizeDisplayName(payload.displayName);
    if (displayName.length < 2) {
      return Response.json({ error: "Jméno musí mít alespoň 2 znaky." }, { status: 400 });
    }

    const update = await supabase
      .from("profiles")
      .update({
        display_name: displayName,
        last_seen_at: new Date().toISOString(),
      })
      .eq("id", user.id)
      .select("id, email, display_name, avatar_url, provider, role, created_at, updated_at, last_seen_at")
      .single();

    if (update.error || !update.data) {
      return Response.json({ error: "Profil se nepodařilo uložit.", details: update.error?.message }, { status: 500 });
    }

    await supabase.from("viewer_activity").insert({
      user_id: user.id,
      event_type: "profile_updated",
      entity_type: "profile",
      entity_id: user.id,
      metadata: {
        display_name_length: displayName.length,
      },
    });

    return Response.json({ ok: true, profile: update.data });
  } catch (error) {
    if (error instanceof AuthApiError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Profil se nepodařilo uložit." }, { status: 500 });
  }
}

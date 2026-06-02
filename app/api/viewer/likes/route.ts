import { AuthApiError, requireAuthenticatedUser } from "@/lib/supabase/authenticated-server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type LikePayload = {
  entityType?: unknown;
  entityId?: unknown;
};

function normalizeInput(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function resolveEntity(payload: LikePayload): { entityType: string; entityId: string } | null {
  const entityType = normalizeInput(payload.entityType);
  const entityId = normalizeInput(payload.entityId);
  if (!entityType || !entityId) return null;
  return { entityType: entityType.slice(0, 100), entityId: entityId.slice(0, 160) };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const entityType = normalizeInput(url.searchParams.get("entityType"));
  const entityId = normalizeInput(url.searchParams.get("entityId"));
  if (!entityType || !entityId) {
    return Response.json({ error: "entityType a entityId jsou povinné." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ liked: false });
  }

  const lookup = await supabase
    .from("likes")
    .select("id")
    .eq("user_id", user.id)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .limit(1);

  if (lookup.error) {
    return Response.json({ error: "Nepodařilo se načíst stav lajku." }, { status: 500 });
  }

  return Response.json({ liked: (lookup.data?.length ?? 0) > 0 });
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireAuthenticatedUser();
    const payload = (await request.json().catch(() => ({}))) as LikePayload;
    const entity = resolveEntity(payload);
    if (!entity) {
      return Response.json({ error: "entityType a entityId jsou povinné." }, { status: 400 });
    }

    const insert = await supabase.from("likes").insert({
      user_id: user.id,
      entity_type: entity.entityType,
      entity_id: entity.entityId,
    });

    if (insert.error && insert.error.code !== "23505") {
      return Response.json({ error: "Uložení lajku selhalo." }, { status: 500 });
    }

    await supabase.from("viewer_activity").insert({
      user_id: user.id,
      event_type: "like_created",
      entity_type: entity.entityType,
      entity_id: entity.entityId,
      metadata: {},
    });

    return Response.json({ ok: true, liked: true });
  } catch (error) {
    if (error instanceof AuthApiError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Lajk se nepodařilo uložit." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { supabase, user } = await requireAuthenticatedUser();
    const url = new URL(request.url);
    const entityType = normalizeInput(url.searchParams.get("entityType"));
    const entityId = normalizeInput(url.searchParams.get("entityId"));
    if (!entityType || !entityId) {
      return Response.json({ error: "entityType a entityId jsou povinné." }, { status: 400 });
    }

    const remove = await supabase
      .from("likes")
      .delete()
      .eq("user_id", user.id)
      .eq("entity_type", entityType)
      .eq("entity_id", entityId);

    if (remove.error) {
      return Response.json({ error: "Odebrání lajku selhalo." }, { status: 500 });
    }

    await supabase.from("viewer_activity").insert({
      user_id: user.id,
      event_type: "like_removed",
      entity_type: entityType,
      entity_id: entityId,
      metadata: {},
    });

    return Response.json({ ok: true, liked: false });
  } catch (error) {
    if (error instanceof AuthApiError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Lajk se nepodařilo odebrat." }, { status: 500 });
  }
}

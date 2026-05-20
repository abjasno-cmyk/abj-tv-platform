import { AuthApiError, requireAuthenticatedUser } from "@/lib/supabase/authenticated-server";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

type UpdateCommentPayload = {
  body?: unknown;
  status?: unknown;
};

function normalize(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await Promise.resolve(context.params);
    const { supabase, user } = await requireAuthenticatedUser();
    const payload = (await request.json().catch(() => ({}))) as UpdateCommentPayload;
    const body = normalize(payload.body);
    const status = normalize(payload.status);

    const updatePayload: Record<string, unknown> = {};
    if (body) {
      if (body.length > 2000) {
        return Response.json({ error: "Komentář je příliš dlouhý." }, { status: 400 });
      }
      updatePayload.body = body;
    }
    if (status) {
      updatePayload.status = status.slice(0, 30);
    }

    if (Object.keys(updatePayload).length === 0) {
      return Response.json({ error: "Není co aktualizovat." }, { status: 400 });
    }

    const updateResult = await supabase
      .from("comments")
      .update(updatePayload)
      .eq("id", id)
      .select("id, user_id, entity_type, entity_id, parent_id, body, status, created_at, updated_at")
      .single();

    if (updateResult.error || !updateResult.data) {
      const message = updateResult.error?.message?.toLowerCase() ?? "";
      const statusCode = message.includes("row-level security") ? 403 : 500;
      return Response.json({ error: "Komentář se nepodařilo upravit.", details: updateResult.error?.message }, { status: statusCode });
    }

    await supabase.from("viewer_activity").insert({
      user_id: user.id,
      event_type: "comment_updated",
      entity_type: updateResult.data.entity_type,
      entity_id: updateResult.data.entity_id,
      metadata: {
        comment_id: updateResult.data.id,
      },
    });

    return Response.json({ ok: true, comment: updateResult.data });
  } catch (error) {
    if (error instanceof AuthApiError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Komentář se nepodařilo upravit." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await Promise.resolve(context.params);
    const { supabase, user } = await requireAuthenticatedUser();

    const lookup = await supabase.from("comments").select("id, entity_type, entity_id").eq("id", id).maybeSingle();
    if (lookup.error) {
      return Response.json({ error: "Nepodařilo se načíst komentář.", details: lookup.error.message }, { status: 500 });
    }
    if (!lookup.data) {
      return Response.json({ error: "Komentář nebyl nalezen." }, { status: 404 });
    }

    const removal = await supabase.from("comments").delete().eq("id", id);
    if (removal.error) {
      const message = removal.error.message.toLowerCase();
      const statusCode = message.includes("row-level security") ? 403 : 500;
      return Response.json({ error: "Komentář se nepodařilo smazat.", details: removal.error.message }, { status: statusCode });
    }

    await supabase.from("viewer_activity").insert({
      user_id: user.id,
      event_type: "comment_deleted",
      entity_type: lookup.data.entity_type,
      entity_id: lookup.data.entity_id,
      metadata: {
        comment_id: id,
      },
    });

    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthApiError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Komentář se nepodařilo smazat." }, { status: 500 });
  }
}
